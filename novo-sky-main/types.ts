
import type { Session } from '@supabase/supabase-js';

export type { Session };

export enum PipelineStage {
  LEADS = 'Leads',
  CONTATADOS = 'Contatados',
  STAGE_414 = '4/14',
  AGENDADO = 'Agendado',
  VISITA_CONCLUIDA = 'Visita Realizada',
  REAGENDAR = 'Reagendar',
  NEGOCIACAO = 'Negociação',
  PEDIDO = 'Pedido',
  POS_VENDA = 'Pós-venda',
  ADD_ON = 'Add-on',
  FRENTE = '+Frente',
  ABORDAGEM = 'Abordagem',
  FOLLOW_UP = 'Follow up',
  EM_CONVERSA = 'Em conversa',
  PROPOSTA_ENVIADA = 'Proposta enviada',
  VENDIDO = 'Vendido',
  PERDIDO = 'Perdido'
}

export enum CustomerPipelineStage {
  CLIENTES_SKY = 'Clientes Sky',
  CLIENTES_MILLION = 'Clientes Milionário',
  CLIENTES_DIGN = 'Clientes Digno',
  ABORDAGEM = 'Abordagem',
  FOLLOW_UP = 'Follow up',
  EM_CONVERSA = 'Em conversa',
  PROPOSTA_ENVIADA = 'Proposta enviada',
  VENDIDO = 'Vendido',
  PERDIDO = 'Perdido',
  FRENTE = '+Frente'
}

export interface UserProfile {
  name: string;
  image: string | null;
  monthlyRevenueMeta?: number;
  monthlyVisitsMeta?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  city: string;
  notes: string;
  interactions: Interaction[];
  orders: string[];
  lastContactDate?: string;
}

export interface Interaction {
  id: string;
  date: string;
  type: 'call' | 'visit' | 'whatsapp' | 'meeting' | 'task';
  notes: string;
}

export interface Lead {
  id: string;
  customerId?: string;
  prospectName?: string;
  prospectPhone?: string;
  prospectCity?: string;
  prospectAddress?: string;
  prospectNotes?: string;
  stage: string;
  productInterest: string;
  estimatedValue: number;
  lastInteraction: string;
  nextContactDate: string;
  nextActionDescription?: string;
  pipelineType: 'new' | 'million' | 'sky' | 'dign' | 'rebuy';
  assignedTo: string;
  referredBy?: string;
  recurrence?: RecurrenceType;
}

export type ApptType = 'visit' | 'meeting' | 'task' | 'call' | 'after-sales' | 'training' | 'other';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'every_15_days';

export interface Appointment {
  id: string;
  title: string;
  client: string;
  date: string;
  time: string;
  address: string;
  type: ApptType;
  synced: boolean;
  completed: boolean;
  leadId?: string;
}

export interface Program414 {
  id: string;
  indicatorId: string;
  indicatorName: string;
  startDate: string;
  endDate: string;
  giftChosen: string;
  referralIds: string[];
  status: 'active' | 'completed' | 'expired';
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  cost: number;
  price: number;
  margin: number;
  image?: string;
  category: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  category: string;
  minQuantity: number;
  lastUpdated: string;
}

export interface Order {
  id: string;
  customerId: string;
  salespersonId?: string;
  items: OrderItem[];
  total: number;
  date: string;
  status: 'pending' | 'completed' | 'cancelled';
  installments: number;
  downPayment: number;
  orderType?: 'new' | 'addon' | 'history';
}

export interface OrderItem {
  productId: string;
  quantity: number;
  priceAtSale: number;
}

export type TeamRole = 'distribuidor_jr' | 'vendedor' | 'recruta' | 'trainee' | 'gerente';

export interface TeamMember {
  id: string;
  name: string;
  role: TeamRole;
  goals: number;
  promotionGoal: number;
  salesVolume: number;
  totalVolume: number;
  progressToPromotion: number;
  startDate: string;
}

export interface DeletedItems {
  customers?: string[];
  leads?: string[];
  products?: string[];
  orders?: string[];
  team?: string[];
  inventory?: string[];
  appointments?: string[];
  programs414?: string[];
}