
export interface Material {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  min_quantity: number;
  compatible_vehicles?: string;
  created_at?: string;
}

export enum MovementType {
  ENTRY = 'ENTRADA',
  EXIT = 'SAIDA'
}

export interface Movement {
  id: string;
  material_id: string;
  material_name?: string;
  type: MovementType;
  quantity: number;
  requester?: string | null;
  vehicle_prefix?: string | null;
  guide_number: string;
  observation?: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  prefix: string;
  plate: string;
  model: string;
  fraction: string;
}

export interface PavProcess {
  id: string;
  fraction: string;
  vehicle_prefix: string;
  vehicle_plate: string;
  accident_date: string | null;
  reds_number: string;
  pav_number: string;
  inquirer: string;
  inquirer_pm_number: string;
  sent_to_inquirer: boolean;
  os_request_date: string | null;
  os_number: string;
  os_followup_date: string | null;
  observations: string;
  created_at: string;
}

export interface VehicleSchedule {
  id: string;
  vehicle_prefix: string;
  driver_name: string;
  reason: string;
  start_time: string;
  end_time: string;
  observations: string;
  created_at: string;
}

export interface FleetSubstitution {
  id: string;
  received_prefix: string;
  received_plate: string;
  received_model: string;
  received_bgpm: string;
  received_city: string;
  received_unit: string;
  indicated_prefix: string | null;
  indicated_plate: string | null;
  not_required: boolean;
  created_at: string;
}

export interface FuelRecord {
  id: string;
  vehicle_prefix: string;
  vehicle_plate: string;
  driver_name: string;
  liters: number;
  fuel_type: 'DIESEL' | 'GASOLINA' | 'ETANOL';
  odometer: number;
  fraction: string;
  created_at: string;
}

export type Tab = 'inventory' | 'movements' | 'fleet' | 'setup';
export type ModuleType = 'STOCK' | 'PAV' | 'SCHEDULE' | 'SUBSTITUTION' | 'FUEL' | null;
