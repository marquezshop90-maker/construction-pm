"""
One-time import script: reads your original Excel file (DB1 + Budgeted3)
and loads everything into Supabase.

Usage:
  pip install pandas openpyxl supabase python-dotenv
  python scripts/import_excel.py "path\\to\\file.xlsm"
"""
import sys, os, math, pandas as pd
from datetime import datetime, date
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))
client = create_client(os.environ['NEXT_PUBLIC_SUPABASE_URL'],
                       os.environ['NEXT_PUBLIC_SUPABASE_ANON_KEY'])

def isnan(v):
    try: return math.isnan(float(v))
    except: return False

def safe_str(v):
    if v is None: return None
    s = str(v).strip()
    return None if s in ('', '-', 'nan', 'None', 'NaT', 'Entry Data', 'Add data') else s

def safe_num(v):
    if v is None or (isinstance(v, float) and isnan(v)): return None
    try: return float(str(v).replace(',', ''))
    except: return None

def safe_int(v):
    n = safe_num(v)
    return None if n is None else int(round(n))

def safe_date(v):
    if v is None: return None
    if isinstance(v, (datetime, date)): return v.strftime('%Y-%m-%d')
    try:
        s = str(v).strip()
        if not s or s in ('nan', '-'): return None
        n = float(s)
        from pandas import Timestamp
        return (Timestamp('1899-12-30') + pd.Timedelta(days=n)).strftime('%Y-%m-%d')
    except:
        try: return pd.to_datetime(v).strftime('%Y-%m-%d')
        except: return None

# ── Read Budgeted3 reference values ──────────────────────────────────────────
def read_budgeted3(path):
    df = pd.read_excel(path, sheet_name='Budgeted3', header=6, engine='openpyxl')
    df.columns = ['name','description','type','price_per','qty','total',
                  'blank','ref_value','ref_label'] + [f'x{i}' for i in range(9, len(df.columns))]

    LABEL_MAP = {
        'Floor SF':               'floor_sf',
        'Truss Price':            'truss_price',
        'frame material':         'frame_material',
        'Frame L, N, E Price':    'frame_lne_price',
        'Siding L & M':           'siding_lm',
        'Siding SF':              'siding_sf',
        'Windows':                'windows',
        'Patio Doors':            'patio_doors',
        'Shaftwall LF Per Level': 'shaftwall_lf_per_level',
    }

    # Extract reference values per project
    ref_data = {}  # { project_name: { field: value } }
    for _, row in df.iterrows():
        label = safe_str(row.get('ref_label'))
        if label and label in LABEL_MAP:
            name = safe_str(row.get('name'))
            if name:
                if name not in ref_data: ref_data[name] = {}
                ref_data[name][LABEL_MAP[label]] = safe_num(row.get('ref_value'))

    # Extract line items per project
    line_items = {}  # { project_name: [ {description, type, price_per, qty, total} ] }
    for _, row in df.iterrows():
        name = safe_str(row.get('name'))
        desc = safe_str(row.get('description'))
        if not name or not desc: continue
        if name not in line_items: line_items[name] = []
        line_items[name].append({
            'description': desc,
            'type':        safe_str(row.get('type')),
            'price_per':   safe_num(row.get('price_per')),
            'qty':         safe_num(row.get('qty')),
            'total':       safe_num(row.get('total')),
        })

    return ref_data, line_items

# ── Read DB1 ──────────────────────────────────────────────────────────────────
def read_db1(path):
    df = pd.read_excel(path, sheet_name='DB1', header=2, engine='openpyxl')
    cols = [
        'row_num','project_name','client_response','year_completed','date_of_bid',
        'idapac_index','contract_type','architect','engineer','gc',
        'city','state','building_type','style','complexity',
        'wind_rating','ibc_code_year','levels','wall_height',
        'stair_shaft','stair_framing','hardware_complexity','clubhouse',
        'floor_sf','siding_sf','pct_siding_vs_floor','exterior_wall_sf',
        'windows','patio_doors','entry_doors','shaftwall_lf_per_level',
        'truss_depth','truss_spacing',
        'frame_lne_price_sf','frame_lne_price','frame_material_sf','frame_material',
        'truss_sf','truss_price','siding_lm_sf','siding_lm',
        'total_price_sf','total_contract_price','change_orders',
        'contract_price_cos','frame_lne_cost_sf',
    ]
    df.columns = cols[:len(df.columns)]
    return df

# ── Main import ───────────────────────────────────────────────────────────────
def run(path):
    print(f"\n📂 Reading: {path}")
    ref_data, line_items = read_budgeted3(path)
    df = read_db1(path)

    print(f"   Found {len(ref_data)} projects in Budgeted3")
    print(f"   Found {len(df)} rows in DB1\n")

    projects_imported = 0
    items_imported    = 0
    errors            = []

    for _, row in df.iterrows():
        name = safe_str(row.get('project_name'))
        if not name: continue

        resp = safe_str(row.get('client_response'))
        if resp:
            resp = 'Won' if resp.lower() == 'won' else 'Lost' if resp.lower() == 'lost' else None

        refs = ref_data.get(name, {})

        # Prefer Budgeted3 values for financial/dimension fields
        floor_sf              = refs.get('floor_sf')       or safe_num(row.get('floor_sf'))
        siding_sf             = refs.get('siding_sf')      or safe_num(row.get('siding_sf'))
        windows               = safe_int(refs.get('windows')) if refs.get('windows') is not None else safe_int(row.get('windows'))
        patio_doors           = safe_int(refs.get('patio_doors')) if refs.get('patio_doors') is not None else safe_int(row.get('patio_doors'))
        shaftwall             = refs.get('shaftwall_lf_per_level') or safe_num(row.get('shaftwall_lf_per_level'))
        frame_lne_price       = refs.get('frame_lne_price') or safe_num(row.get('frame_lne_price'))
        frame_material        = refs.get('frame_material')  or safe_num(row.get('frame_material'))
        truss_price           = refs.get('truss_price')     or safe_num(row.get('truss_price'))
        siding_lm             = refs.get('siding_lm')       or safe_num(row.get('siding_lm'))
        change_orders         = safe_num(row.get('change_orders'))

        # Calculate derived fields
        fs = floor_sf or 0
        frame_lne_price_sf  = (frame_lne_price / fs) if fs > 0 and frame_lne_price else 0
        frame_material_sf   = (frame_material  / fs) if fs > 0 and frame_material  else 0
        truss_sf            = (truss_price     / fs) if fs > 0 and truss_price     else 0
        siding_lm_sf        = (siding_lm       / fs) if fs > 0 and siding_lm       else 0
        total_price_sf      = frame_lne_price_sf + frame_material_sf + truss_sf + siding_lm_sf
        total_contract_price = total_price_sf * fs
        contract_price_cos  = total_contract_price + (change_orders or 0)
        pct_siding          = ((siding_sf or 0) / fs) if fs > 0 else 0

        project = {
            'project_name':           name,
            'client_response':        resp,
            'year_completed':         safe_int(row.get('year_completed')),
            'date_of_bid':            safe_date(row.get('date_of_bid')),
            'idapac_index':           safe_num(row.get('idapac_index')),
            'contract_type':          safe_str(row.get('contract_type')),
            'architect':              safe_str(row.get('architect')),
            'engineer':               safe_str(row.get('engineer')),
            'gc':                     safe_str(row.get('gc')),
            'city':                   safe_str(row.get('city')),
            'state':                  safe_str(row.get('state')),
            'building_type':          safe_str(row.get('building_type')),
            'style':                  safe_str(row.get('style')),
            'complexity':             safe_str(row.get('complexity')),
            'wind_rating':            safe_num(row.get('wind_rating')),
            'ibc_code_year':          safe_int(row.get('ibc_code_year')),
            'levels':                 safe_int(row.get('levels')),
            'wall_height':            safe_str(row.get('wall_height')),
            'stair_shaft':            safe_str(row.get('stair_shaft')),
            'stair_framing':          safe_str(row.get('stair_framing')),
            'hardware_complexity':    safe_str(row.get('hardware_complexity')),
            'clubhouse':              str(row.get('clubhouse', '')).strip().lower() == 'yes',
            'floor_sf':               floor_sf,
            'siding_sf':              siding_sf,
            'pct_siding_vs_floor':    pct_siding,
            'exterior_wall_sf':       safe_num(row.get('exterior_wall_sf')),
            'windows':                windows,
            'patio_doors':            patio_doors,
            'entry_doors':            safe_int(row.get('entry_doors')),
            'shaftwall_lf_per_level': shaftwall,
            'truss_depth':            safe_str(row.get('truss_depth')),
            'truss_spacing':          safe_str(row.get('truss_spacing')),
            'frame_lne_price':        frame_lne_price,
            'frame_material':         frame_material,
            'truss_price':            truss_price,
            'siding_lm':              siding_lm,
            'change_orders':          change_orders,
            'frame_lne_price_sf':     frame_lne_price_sf,
            'frame_material_sf':      frame_material_sf,
            'truss_sf':               truss_sf,
            'siding_lm_sf':           siding_lm_sf,
            'total_price_sf':         total_price_sf,
            'total_contract_price':   total_contract_price,
            'contract_price_cos':     contract_price_cos,
        }

        try:
            res = client.table('projects').insert(project).execute()
            project_id = res.data[0]['id'] if res.data else None
            projects_imported += 1
            print(f"  ✓ Project: {name}")

            # Import budget line items
            if project_id and name in line_items:
                client.table('budget_items').delete().eq('project_id', project_id).execute()
                budget_rows = [
                    {**item, 'project_id': project_id, 'sort_order': i}
                    for i, item in enumerate(line_items[name])
                ]
                if budget_rows:
                    client.table('budget_items').insert(budget_rows).execute()
                    items_imported += len(budget_rows)
                    print(f"    → {len(budget_rows)} budget line items")
        except Exception as e:
            errors.append(f"{name}: {e}")
            print(f"  ✗ {name}: {e}")

    print(f"\n✅ Done!")
    print(f"   Projects imported: {projects_imported}")
    print(f"   Budget items imported: {items_imported}")
    if errors:
        print(f"   Errors ({len(errors)}): {errors}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python scripts/import_excel.py <path_to_xlsm>")
        sys.exit(1)
    run(sys.argv[1])

