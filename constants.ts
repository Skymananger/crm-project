
import { PipelineStage, RecurrenceType } from './types';

export const APP_VERSION = "1.0.5";

export const COLORS = {
  skyBlue: '#00A8E8',
  deepBlue: '#003459',
  iceWhite: '#F8FAFC',
};

export const PIPELINE_STAGES: PipelineStage[] = [
  PipelineStage.ABORDAGEM,
  PipelineStage.FOLLOW_UP,
  PipelineStage.EM_CONVERSA,
  PipelineStage.PROPOSTA_ENVIADA,
  PipelineStage.VENDIDO,
  PipelineStage.PERDIDO,
  PipelineStage.FRENTE
];

export const STORAGE_KEYS = {
  CUSTOMERS: 'sky_customers',
  LEADS: 'sky_leads',
  PRODUCTS: 'sky_products',
  ORDERS: 'sky_orders',
  TEAM: 'sky_team',
  SETTINGS: 'sky_settings',
  PROGRAMS_414: 'sky_programs_414',
  INVENTORY: 'sky_inventory',
  DELETED_ITEMS: 'sky_deleted_items',
  APPOINTMENTS: 'sky_appointments'
};

export const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const calculateNextRecurrenceDate = (currentDate: string, recurrence: RecurrenceType): string => {
  if (!recurrence || recurrence === 'none') return '';
  
  const date = new Date(currentDate + 'T12:00:00'); // Use noon to avoid timezone issues
  
  switch (recurrence) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'every_15_days':
      date.setDate(date.getDate() + 15);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      return '';
  }
  
  return getLocalDateString(date);
};
