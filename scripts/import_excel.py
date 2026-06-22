"""
Import script: Excel → Supabase
Usage: python scripts/import_excel.py <path_to_xlsm_file>

Requirements:
  pip install pandas openpyxl supabase python-dotenv
"""
import sys, os, pandas as pd, json
from datetime import datetime, date
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

SUPABASE_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SUPABASE_KEY = os.environ['NEXT_PUBLIC_SUPABASE_ANON_KEY']

client = create_client(SUPABASE_URL, SUPABASE_KEY)

def safe_float(val):
    try:
        if val is None or (isinstance(val, float) and pd.isna(val)): return None
        f = float(str(val).replace(',',''))
        return None if pd.isna(f) else f
    except: return None

def safe_int(val):
    f = safe_float(val)
    return None if f is None else int(f)

def safe_str(val):
    if val is None: return None
    s = str(val).strip()
    return None if s in ('', '-', 'nan', 'None', 'Entry Data', 'Add data') else s

def safe_date(val):
    if val is None: return None
    if isinstance(val, (datetime, date)):
        return val.strftime('%Y-%m-%d')
    try:
        s = str(val).strip()
        if s in ('', '-', 'nan'): return None
        n = float(s)
        # Excel serial date
        origin = pd.Timestamp('1899-12-30')
        return (origin + pd.Timedelta(days=n)).strftime('%Y-%m-%d')
    except:
        try:
            return pd.to_datetime(val).strftime('%Y-%m-%d')
        except: return None

def import_file(path: str):
    # Read with header at row index 2
    df = pd.read_excel(path, sheet_name='DB1', header=2, engine='openpyxl')

    # Rename columns by position (match column order from the sheet)
    cols = [
        'row_num', 'project_name', 'client_response', 'year_completed', 'date_of_bid',
        'idapac_index', 'contract_type', 'architect', 'engineer', 'gc',
        'city', 'state', 'building_type', 'style', 'complexity',
        'wind_rating', 'ibc_code_year', 'levels', 'wall_height',
        'stair_shaft', 'stair_framing', 'hardware_complexity', 'clubhouse',
        'floor_sf', 'siding_sf', 'pct_siding_vs_floor', 'exterior_wall_sf',
        'windows', 'patio_doors', 'entry_doors', 'shaftwall_lf_per_level',
        'truss_depth', 'truss_spacing',
        'frame_lne_price_sf', 'frame_lne_price', 'frame_material_sf', 'frame_material',
        'truss_sf', 'truss_price', 'siding_lm_sf', 'siding_lm',
        'total_price_sf', 'total_contract_price', 'change_orders',
        'contract_price_cos', 'frame_lne_cost_sf',
    ]
    df.columns = cols[:len(df.columns)]

    records = []
    for _, row in df.iterrows():
        name = safe_str(row.get('project_name'))
        if not name:
            continue  # Skip empty rows

        clubhouse_val = safe_str(row.get('clubhouse'))
        clubhouse = True if clubhouse_val and clubhouse_val.lower() == 'yes' else False

        resp = safe_str(row.get('client_response'))
        if resp and resp.lower() == 'won': resp = 'Won'
        elif resp and resp.lower() == 'lost': resp = 'Lost'
        else: resp = None

        rec = {
            'project_name':           name,
            'client_response':        resp,
            'year_completed':         safe_int(row.get('year_completed')),
            'date_of_bid':            safe_date(row.get('date_of_bid')),
            'idapac_index':           safe_float(row.get('idapac_index')),
            'contract_type':          safe_str(row.get('contract_type')),
            'architect':              safe_str(row.get('architect')),
            'engineer':               safe_str(row.get('engineer')),
            'gc':                     safe_str(row.get('gc')),
            'city':                   safe_str(row.get('city')),
            'state':                  safe_str(row.get('state')),
            'building_type':          safe_str(row.get('building_type')),
            'style':                  safe_str(row.get('style')),
            'complexity':             safe_str(row.get('complexity')),
            'wind_rating':            safe_float(row.get('wind_rating')),
            'ibc_code_year':          safe_int(row.get('ibc_code_year')),
            'levels':                 safe_int(row.get('levels')),
            'wall_height':            safe_str(row.get('wall_height')),
            'stair_shaft':            safe_str(row.get('stair_shaft')),
            'stair_framing':          safe_str(row.get('stair_framing')),
            'hardware_complexity':    safe_str(row.get('hardware_complexity')),
            'clubhouse':              clubhouse,
            'floor_sf':               safe_float(row.get('floor_sf')),
            'siding_sf':              safe_float(row.get('siding_sf')),
            'pct_siding_vs_floor':    safe_float(row.get('pct_siding_vs_floor')),
            'exterior_wall_sf':       safe_float(row.get('exterior_wall_sf')),
            'windows':                safe_int(row.get('windows')),
            'patio_doors':            safe_int(row.get('patio_doors')),
            'entry_doors':            safe_int(row.get('entry_doors')),
            'shaftwall_lf_per_level': safe_float(row.get('shaftwall_lf_per_level')),
            'truss_depth':            safe_str(row.get('truss_depth')),
            'truss_spacing':          safe_str(row.get('truss_spacing')),
            'frame_lne_price_sf':     safe_float(row.get('frame_lne_price_sf')),
            'frame_lne_price':        safe_float(row.get('frame_lne_price')),
            'frame_material_sf':      safe_float(row.get('frame_material_sf')),
            'frame_material':         safe_float(row.get('frame_material')),
            'truss_sf':               safe_float(row.get('truss_sf')),
            'truss_price':            safe_float(row.get('truss_price')),
            'siding_lm_sf':           safe_float(row.get('siding_lm_sf')),
            'siding_lm':              safe_float(row.get('siding_lm')),
            'total_price_sf':         safe_float(row.get('total_price_sf')),
            'total_contract_price':   safe_float(row.get('total_contract_price')),
            'change_orders':          safe_float(row.get('change_orders')),
            'contract_price_cos':     safe_float(row.get('contract_price_cos')),
            'frame_lne_cost_sf':      safe_float(row.get('frame_lne_cost_sf')),
        }
        records.append(rec)

    print(f"📦 Found {len(records)} valid projects to import...")

    batch_size = 10
    imported = 0
    errors = 0
    for i in range(0, len(records), batch_size):
        batch = records[i:i+batch_size]
        try:
            result = client.table('projects').insert(batch).execute()
            imported += len(batch)
            print(f"  ✓ Imported {imported}/{len(records)}")
        except Exception as e:
            print(f"  ✗ Error on batch {i}: {e}")
            errors += len(batch)

    print(f"\n✅ Done! Imported: {imported}  Errors: {errors}")

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else 'Project_History_Data_Base__1__UPDATE.xlsm'
    import_file(path)
