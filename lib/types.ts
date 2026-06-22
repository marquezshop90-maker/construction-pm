export interface Project {
  id: string
  project_name: string
  client_response: 'Won' | 'Lost' | 'Pending' | null
  year_completed: number | null
  date_of_bid: string | null
  idapac_index: number | null
  contract_type: 'Turn-Key' | 'Labor' | null
  architect: string | null
  engineer: string | null
  gc: string | null
  city: string | null
  state: string | null
  building_type: string | null
  style: string | null
  complexity: 'Easy' | 'Medium' | 'Hard' | null
  wind_rating: number | null
  ibc_code_year: number | null
  levels: number | null
  wall_height: string | null
  stair_shaft: string | null
  stair_framing: string | null
  hardware_complexity: string | null
  clubhouse: boolean | null
  floor_sf: number | null
  siding_sf: number | null
  pct_siding_vs_floor: number | null   // calculated: siding_sf / floor_sf
  exterior_wall_sf: number | null
  windows: number | null
  patio_doors: number | null
  entry_doors: number | null
  shaftwall_lf_per_level: number | null
  truss_depth: string | null
  truss_spacing: string | null
  // Manual price inputs
  frame_lne_price: number | null
  frame_material: number | null
  truss_price: number | null
  siding_lm: number | null
  change_orders: number | null
  // Auto-calculated (stored for dashboard queries)
  frame_lne_price_sf: number | null    // frame_lne_price / floor_sf
  frame_material_sf: number | null     // frame_material / floor_sf
  truss_sf: number | null              // truss_price / floor_sf
  siding_lm_sf: number | null         // siding_lm / floor_sf
  total_price_sf: number | null       // sum of all /SF fields
  total_contract_price: number | null  // total_price_sf * floor_sf
  contract_price_cos: number | null    // total_contract_price + change_orders
  created_at: string
  updated_at: string
}

export type ProjectInsert = Omit<Project, 'id' | 'created_at' | 'updated_at'>
export type ProjectUpdate = Partial<ProjectInsert>

export interface DashboardStats {
  total: number
  won: number
  lost: number
  pending: number
  total_value: number
  avg_value: number
  win_rate: number
}

export interface BudgetItem {
  id: string
  project_id: string
  description: string | null
  type: string | null
  price_per: number | null
  qty: number | null
  total: number | null
  sort_order: number
  created_at: string
}
