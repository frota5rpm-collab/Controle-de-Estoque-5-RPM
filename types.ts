export interface Material {
  id: string;
  name: string;
  quantity: number;
  unit: string; // Unidade de medida (Ex: Litros, Peça, Cx)
  min_quantity: number;
  created_at?: string;
}

export enum MovementType {
  ENTRY = 'ENTRADA',
  EXIT = 'SAIDA'
}

export interface Movement {
  id: string;
  material_id: string;
  material_name?: string; // Joined field
  material_unit?: string; // Joined field
  type: MovementType;
  quantity: number;
  requester: string | null;
  vehicle_prefix: string | null;
  guide_number: string;
  created_at: string; // Acts as movement date
}

export interface Vehicle {
  id: string;
  prefix: string;
  plate: string;
  model: string;
  fraction: string;
}

export type Tab = 'inventory' | 'movements' | 'fleet' | 'setup';