
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Customer, Lead, Product, Order, TeamMember, PipelineStage, CustomerPipelineStage, Program414, InventoryItem, UserProfile, Appointment, Session, DeletedItems } from '../types';
import { STORAGE_KEYS, PIPELINE_STAGES as DEFAULT_STAGES } from '../constants';
import { supabase, isSupabaseReady } from '../services/supabase';

interface AppContextType {
  userProfile: UserProfile;
  customers: Customer[];
  leads: Lead[];
  products: Product[];
  orders: Order[];
  team: TeamMember[];
  programs414: Program414[];
  inventory: InventoryItem[];
  appointments: Appointment[];
  pipelineOrder: PipelineStage[];
  millionPipelineOrder: string[];
  skyPipelineOrder: string[];
  dignPipelineOrder: string[];
  loading: boolean;
  machineFees: number[];
  isCloudActive: boolean;
  saving: boolean;
  lastSaved: string | null;
  lastSyncError: string | null;
  pendingCount: number;
  googleMapsApiKey: string | null;
  googleTokens: any | null;
  session: Session | null;
  registerBiometrics: () => Promise<void>;
  loginBiometrics: (email?: string) => Promise<void>;
  setGoogleMapsApiKey: (key: string) => void;
  setGoogleTokens: (tokens: any) => void;
  syncToGoogleCalendar: (event: Appointment) => Promise<void>;
  syncPendingData: () => Promise<void>;
  addCustomer: (c: Omit<Customer, 'id' | 'interactions' | 'orders'>) => Promise<string | null>;
  removeCustomer: (id: string) => Promise<void>;
  removeLead: (id: string) => Promise<void>;
  removeOrder: (id: string) => Promise<void>;
  removeAppointment: (id: string) => Promise<void>;
  removeTeamMember: (id: string) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  removeInventoryItem: (id: string) => Promise<void>;
  updateLeadStage: (leadId: string, newStage: string) => Promise<void>;
  updateLead: (lead: Lead) => Promise<void>;
  addLead: (l: Omit<Lead, 'id'>) => Promise<void>;
  importMillionLeads: () => Promise<void>;
  importDignLeads: () => Promise<void>;
  importSkyLeads: () => Promise<void>;
  importLeadsFromRawText: (text: string, type: 'million' | 'sky' | 'dign') => Promise<void>;
  fixPipelineLeads: () => void;
  moveLeadsBetweenPipelines: (from: 'million' | 'sky' | 'dign', to: 'million' | 'sky' | 'dign') => void;
  clearPipelineLeads: (type: 'million' | 'sky' | 'dign') => void;
  updatePipelineOrder: (newOrder: string[], type?: 'new' | 'million' | 'sky' | 'dign') => Promise<void>;
  renamePipelineStage: (oldName: string, newName: string, type?: 'new' | 'million' | 'sky' | 'dign') => Promise<void>;
  addTeamMember: (m: Omit<TeamMember, 'id' | 'salesVolume' | 'totalVolume' | 'progressToPromotion'>) => Promise<void>;
  addProduct: (p: Omit<Product, 'id'>) => Promise<void>;
  createOrder: (o: Omit<Order, 'id'>) => Promise<void>;
  updateOrder: (o: Order) => Promise<void>;
  updateMachineFees: (fees: number[]) => Promise<void>;
  resetApp: () => Promise<void>;
  importBackup: (json: string) => Promise<void>;
  updateUserProfile: (profile: UserProfile) => Promise<void>;
  start414Program: (p: Omit<Program414, 'id' | 'referralIds' | 'status'>) => Promise<void>;
  addReferralToProgram: (programId: string, lead: Omit<Lead, 'id'>) => Promise<void>;
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => Promise<void>;
  updateInventory: (item: InventoryItem) => Promise<void>;
  addAppointment: (a: Omit<Appointment, 'id'>) => Promise<void>;
  updateAppointment: (a: Appointment) => Promise<void>;
  toggleAppointmentStatus: (id: string) => Promise<void>;
  fetchInitialData: (force?: boolean) => Promise<void>;
  saveProgress: () => void;
  testCloudConnection: () => Promise<void>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  deletedItems: DeletedItems;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper para LocalStorage
const loadLocal = (key: string, defaultValue: any) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const saveLocal = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Helpers de Mapeamento Supabase (CamelCase para SnakeCase)
const mapLeadToDB = (l: any) => ({
  prospect_name: l.prospectName,
  prospect_phone: l.prospectPhone,
  prospect_city: l.prospectCity,
  prospect_notes: l.nextActionDescription ? `${l.prospectNotes || ''}\n[Próxima Ação: ${l.nextActionDescription}]`.trim() : l.prospectNotes,
  stage: l.stage,
  product_interest: l.productInterest,
  estimated_value: l.estimatedValue,
  next_contact_date: (l.nextContactDate && l.nextContactDate.trim() !== '') ? l.nextContactDate : null,
  customer_id: l.customerId
  // pipeline_type removido temporariamente pois a coluna não existe no Supabase do cliente
});

const mapDBToLead = (l: any): Lead => {
  const notes = (l.prospect_notes || '').toLowerCase();
  const stage = (l.stage || '');
  const stageLower = stage.toLowerCase();
  const interest = (l.product_interest || '').toLowerCase();
  
  // Respeita o tipo que já está no banco para evitar sumiço inesperado
  let inferredType: 'new' | 'million' | 'sky' | 'dign' | 'rebuy' = l.pipeline_type || 'new';
  
  // Critério 1 (Prioridade Máxima): nome do estágio
  if (stageLower.includes('milionário') || stageLower.includes('million')) {
    inferredType = 'million';
  } else if (stageLower.includes('digno') || stageLower.includes('dign')) {
    inferredType = 'dign';
  } else if (stageLower.includes('sky') || stageLower === 'produtos') {
    inferredType = 'sky';
  }

  // Critério 2: tags nas notas (para confirmar ou corrigir)
  if (inferredType === 'new') {
    if (notes.includes('pipeline_million') || notes.includes('importado million') || notes.includes('million')) {
      inferredType = 'million';
    } else if (notes.includes('pipeline_dign') || notes.includes('dign')) {
      inferredType = 'dign';
    } else if (notes.includes('pipeline_sky') || notes.includes('sky')) {
      inferredType = 'sky';
    }
  }

  // Critério 3: Se o lead tem produtos registrados nas notas, ele é um cliente SKY
  if (notes.includes('cliente já possui') || notes.includes('produtos:')) {
    if (inferredType !== 'million' && inferredType !== 'dign') {
      inferredType = 'sky';
    }
  }

  // Normalizar estágios antigos para os novos nomes usados nos pipelines
  let normalizedStage = stage;
  if (stageLower === 'clientes dign') normalizedStage = 'Clientes Digno';
  if (stageLower === 'clientes million' || stageLower === 'clientes million (importados)') normalizedStage = 'Clientes Milionário';
  if (stageLower === 'produtos') normalizedStage = 'Clientes Sky';

  return {
    id: l.id,
    customerId: l.customer_id,
    prospectName: l.prospect_name,
    prospectPhone: l.prospect_phone,
    prospectCity: l.prospect_city,
    prospectAddress: '', 
    prospectNotes: l.prospect_notes,
    stage: normalizedStage as PipelineStage,
    productInterest: l.product_interest,
    estimatedValue: Number(l.estimated_value) || 0,
    lastInteraction: l.updated_at || new Date().toISOString(),
    nextContactDate: l.next_contact_date,
    nextActionDescription: '', 
    pipelineType: inferredType as any,
    assignedTo: 'admin', 
    referredBy: undefined
  };
};


const mapOrderToDB = (o: any) => ({
  customer_id: o.customerId,
  salesperson_id: o.salespersonId,
  items: o.items,
  total: o.total,
  date: o.date || null,
  status: o.status,
  installments: o.installments,
  down_payment: o.downPayment,
  order_type: o.orderType
});

const mapDBToOrder = (o: any): Order => ({
  id: o.id,
  customerId: o.customer_id,
  salespersonId: o.salesperson_id,
  items: o.items || [],
  total: Number(o.total) || 0,
  date: o.date,
  status: o.status,
  installments: o.installments || 1,
  downPayment: o.down_payment || 0,
  orderType: o.order_type
});

const mapInventoryToDB = (i: any) => ({
  name: i.name,
  quantity: i.quantity,
  category: i.category,
  min_quantity: i.minQuantity,
  last_updated: i.lastUpdated
});

const mapDBToInventory = (i: any): InventoryItem => ({
  id: i.id,
  name: i.name,
  quantity: i.quantity,
  category: i.category,
  minQuantity: i.min_quantity,
  lastUpdated: i.last_updated
});

const mapDBToCustomer = (c: any): Customer => ({
  id: c.id,
  name: c.name,
  phone: c.phone,
  city: c.city,
  notes: c.notes || '',
  interactions: [],
  orders: [],
  lastContactDate: c.last_contact_date
});

const mapDBToTeamMember = (t: any): TeamMember => ({
  id: t.id,
  name: t.name,
  role: t.role,
  goals: t.goals || 0,
  promotionGoal: t.promotion_goal || 0,
  salesVolume: 0,
  totalVolume: 0,
  progressToPromotion: 0,
  startDate: t.start_date
});

const mapAppointmentToDB = (a: any) => ({
  title: a.title,
  client: a.client,
  date: a.date || null,
  time: a.time,
  address: a.address,
  type: a.type,
  lead_id: a.leadId
});

const mapDBToAppointment = (a: any): Appointment => ({
  id: a.id,
  title: a.title,
  client: a.client,
  date: a.date,
  time: a.time,
  address: a.address,
  type: a.type,
  synced: true,
  completed: false,
  leadId: a.lead_id
});

const mapProgramToDB = (p: any) => ({
  indicator_id: p.indicatorId,
  indicator_name: p.indicatorName,
  start_date: p.startDate || null,
  end_date: p.endDate || null,
  gift_chosen: p.giftChosen,
  referral_ids: p.referralIds,
  status: p.status
});

const mapDBToProgram = (p: any): Program414 => ({
  id: p.id,
  indicatorId: p.indicator_id,
  indicatorName: p.indicator_name,
  startDate: p.start_date,
  endDate: p.end_date,
  giftChosen: p.gift_chosen,
  referralIds: p.referral_ids || [],
  status: p.status
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadLocal('sky_user_profile', { 
    name: 'Diretoria Sky', 
    image: null,
    monthlyRevenueMeta: 50000,
    monthlyVisitsMeta: 40
  }));
  const [customers, setCustomers] = useState<Customer[]>(() => loadLocal(STORAGE_KEYS.CUSTOMERS, []));
  const [leads, setLeads] = useState<Lead[]>(() => {
    const local = loadLocal(STORAGE_KEYS.LEADS, []);
    return local.map((l: any) => {
      // Migração: Se era 'customer', agora é 'million'
      let pType = l.pipelineType;
      if (pType === 'customer') pType = 'million';
      
      if (pType && (pType === 'million' || pType === 'sky' || pType === 'dign' || pType === 'new' || pType === 'rebuy')) {
        return { ...l, pipelineType: pType };
      }

      if (l.stage === 'Clientes SKY') return { ...l, pipelineType: 'sky' };
      if (l.stage === 'Clientes DIGN') return { ...l, pipelineType: 'dign' };
      if (l.stage === 'Clientes Million' || l.stage === 'Clientes Million (Importados)') return { ...l, pipelineType: 'million' };

      const isCustomerStage = [
        'Contatados',
        'Negociação',
        'Fechado',
        'Perdido',
        'Futura Compra'
      ].includes(l.stage);
      return { ...l, pipelineType: isCustomerStage ? 'million' : 'new' };
    });
  });
  const [products, setProducts] = useState<Product[]>(() => loadLocal(STORAGE_KEYS.PRODUCTS, []));
  const [orders, setOrders] = useState<Order[]>(() => loadLocal(STORAGE_KEYS.ORDERS, []));
  const [inventory, setInventory] = useState<InventoryItem[]>(() => loadLocal(STORAGE_KEYS.INVENTORY, []));
  const [appointments, setAppointments] = useState<Appointment[]>(() => loadLocal('sky_appointments', []));
  const [team, setTeam] = useState<TeamMember[]>(() => loadLocal(STORAGE_KEYS.TEAM, []));
  const [programs414, setPrograms414] = useState<Program414[]>(() => loadLocal(STORAGE_KEYS.PROGRAMS_414, []));
  const [pipelineOrder, setPipelineOrder] = useState<PipelineStage[]>(() => loadLocal('sky_pipeline_order', DEFAULT_STAGES));
  const [millionPipelineOrder, setMillionPipelineOrder] = useState<string[]>(() => {
    return loadLocal('sky_million_pipeline_order', [
      CustomerPipelineStage.CLIENTES_MILLION,
      CustomerPipelineStage.ABORDAGEM,
      CustomerPipelineStage.FOLLOW_UP,
      CustomerPipelineStage.EM_CONVERSA,
      CustomerPipelineStage.PROPOSTA_ENVIADA,
      CustomerPipelineStage.VENDIDO,
      CustomerPipelineStage.PERDIDO,
      CustomerPipelineStage.FRENTE
    ]);
  });
  const [skyPipelineOrder, setSkyPipelineOrder] = useState<string[]>(() => {
    return loadLocal('sky_sky_pipeline_order', [
      CustomerPipelineStage.CLIENTES_SKY,
      CustomerPipelineStage.ABORDAGEM,
      CustomerPipelineStage.FOLLOW_UP,
      CustomerPipelineStage.EM_CONVERSA,
      CustomerPipelineStage.PROPOSTA_ENVIADA,
      CustomerPipelineStage.VENDIDO,
      CustomerPipelineStage.PERDIDO,
      CustomerPipelineStage.FRENTE
    ]);
  });
  const [dignPipelineOrder, setDignPipelineOrder] = useState<string[]>(() => {
    return loadLocal('sky_dign_pipeline_order', [
      CustomerPipelineStage.CLIENTES_DIGN,
      CustomerPipelineStage.ABORDAGEM,
      CustomerPipelineStage.FOLLOW_UP,
      CustomerPipelineStage.EM_CONVERSA,
      CustomerPipelineStage.PROPOSTA_ENVIADA,
      CustomerPipelineStage.VENDIDO,
      CustomerPipelineStage.PERDIDO,
      CustomerPipelineStage.FRENTE
    ]);
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [googleMapsApiKey, setGoogleMapsApiKeyInternal] = useState<string | null>(() => loadLocal('sky_google_maps_key', null));
  const [lastSaved, setLastSaved] = useState<string | null>(() => loadLocal('sky_last_saved', null));
  const [session, setSession] = useState<Session | null>(null);
  const [googleTokens, setGoogleTokensState] = useState<any | null>(() => loadLocal('sky_google_tokens', null));
  const [machineFees, setMachineFees] = useState<number[]>(() => loadLocal('sky_settings_fees', new Array(12).fill(1.99)));
  const [deletedItems, setDeletedItems] = useState<DeletedItems>(() => loadLocal(STORAGE_KEYS.DELETED_ITEMS, {}));

  // Refs para controle de concorrência e evitar loops
  const isFetchingRef = React.useRef(false);
  const isSyncingRef = React.useRef(false);
  const lastFetchTimeRef = React.useRef(0);
  const stateRef = React.useRef({ leads, customers, orders, products, team, inventory, appointments, programs414, deletedItems, pendingCount: 0 });

  // Helper para identificar IDs temporários/locais
  const isTemp = (id: string) => id.includes('_') || !id.includes('-');

  // Efeito para importação automática dos leads Million (apenas uma vez)
  React.useEffect(() => {
    /*
    if (!loading) {
      const hasImported = localStorage.getItem('million_leads_auto_imported');
      const millionLeadsExist = leads.some(l => l.pipelineType === 'million');
      
      if (!hasImported || !millionLeadsExist) {
        importMillionLeads(true).then(() => {
          localStorage.setItem('million_leads_auto_imported', 'true');
        });
      }
    }
    */
  }, [loading, leads.length]);

  // Migração de estágios para pipelines simplificados (Uma única coluna por pipeline)
  // Removido para evitar movimentação automática de leads
  React.useEffect(() => {
    // A lógica de importação automática foi removida a pedido do usuário.
    // Agora o usuário tem botões manuais na interface para limpar e importar.
  }, [loading]);

  React.useEffect(() => {
    // Atualiza contador de pendências
    const count = [
      ...leads.filter((l: any) => isTemp(l.id)),
      ...customers.filter((c: any) => isTemp(c.id)),
      ...orders.filter((o: any) => isTemp(o.id)),
      ...products.filter((p: any) => isTemp(p.id)),
      ...team.filter((t: any) => isTemp(t.id)),
      ...inventory.filter((i: any) => isTemp(i.id)),
      ...appointments.filter((a: any) => isTemp(a.id))
    ].length;
    
    stateRef.current = { leads, customers, orders, products, team, inventory, appointments, programs414, deletedItems, pendingCount: count };
    setPendingCount(count);
  }, [leads, customers, orders, products, team, inventory, appointments, programs414]);

  const syncPendingData = useCallback(async () => {
    if (!isSupabaseReady || !supabase || !session || loading || isSyncingRef.current) return;
    
    isSyncingRef.current = true;
    try {
      const { 
        leads: currentLeads, 
        customers: currentCustomers, 
        orders: currentOrders,
        products: currentProducts,
        team: currentTeam,
        inventory: currentInventory,
          appointments: currentAppointments,
          programs414: currentPrograms,
          deletedItems: currentDeletedItems
      } = stateRef.current;

      // Helper para identificar IDs temporários/locais
      const isTemp = (id: string) => id.includes('_') || !id.includes('-');

      const idMap = new Map<string, string>();

      let hasSyncErrors = false;

      // Funções auxiliares para upsert
      const syncTableItems = async (
        tableName: string, 
        localItems: any[], 
        mapToDB: (item: any) => any, 
        mapFromDB: (item: any) => any, 
        setter: React.Dispatch<React.SetStateAction<any[]>>,
        storageKey: string
      ) => {
        // Sincroniza APENAS itens temporários (novos)
        const itemsToSync = localItems.filter(item => isTemp(item.id));
        if (itemsToSync.length === 0) return;

        console.log(`SKY MANAGER: Sincronizando ${itemsToSync.length} itens em ${tableName}...`);

        // Processa um por um para garantir integridade do idMap e evitar sobrecarga
        for (const localItem of itemsToSync) {
          try {
            const dbData = mapToDB(localItem);
            
            console.log(`SKY MANAGER: Enviando item para ${tableName}:`, dbData);
            
            // Se for um item que depende de outro (ex: Lead -> Customer), atualiza o ID se estiver no idMap
            if (tableName === 'leads' && dbData.customer_id && idMap.has(dbData.customer_id)) {
              dbData.customer_id = idMap.get(dbData.customer_id);
            } else if (tableName === 'orders' && dbData.customer_id && idMap.has(dbData.customer_id)) {
              dbData.customer_id = idMap.get(dbData.customer_id);
            } else if (tableName === 'appointments' && dbData.lead_id && idMap.has(dbData.lead_id)) {
              dbData.lead_id = idMap.get(dbData.lead_id);
            } else if (tableName === 'programs_414' && dbData.indicator_id && idMap.has(dbData.indicator_id)) {
              dbData.indicator_id = idMap.get(dbData.indicator_id);
            }

            const { data, error } = await supabase!.from(tableName).insert([dbData]).select();

            if (error) {
              console.error(`Erro ao sincronizar ${tableName} (${localItem.id}):`, error);
              setLastSyncError(`Erro em ${tableName}: ${error.message}`);
              hasSyncErrors = true;
              continue;
            }

            if (data && data.length > 0) {
              const newItem = mapFromDB(data[0]);
              idMap.set(localItem.id, newItem.id);
              setter(prev => {
                const updated = prev.map(item => item.id === localItem.id ? newItem : item);
                saveLocal(storageKey, updated);
                return updated;
              });
            } else {
              console.warn(`SKY MANAGER: Inserção em ${tableName} não retornou dados.`);
            }
          } catch (itemError: any) {
            console.error(`Erro fatal no item ${localItem.id} de ${tableName}:`, itemError);
            hasSyncErrors = true;
          }
        }
      };

      // Processar exclusões primeiro
      const processDeletions = async (tableName: string, ids: string[] | undefined, key: keyof DeletedItems) => {
        if (!ids || ids.length === 0) return;
        
        // Excluir em paralelo
        await Promise.all(ids.map(async (id) => {
          if (!isTemp(id)) {
            const { error } = await supabase!.from(tableName).delete().eq('id', id);
            if (error) {
              console.error(`Erro ao excluir ${tableName} ${id}:`, error);
              setLastSyncError(`Erro ao excluir ${tableName} ${id}: ${error.message}`);
            }
          }
        }));

        // Limpar os IDs excluídos após o processamento
        setDeletedItems(prev => {
          const newDeleted = { ...prev };
          delete newDeleted[key];
          saveLocal(STORAGE_KEYS.DELETED_ITEMS, newDeleted);
          return newDeleted;
        });
      };

      await processDeletions('customers', currentDeletedItems.customers, 'customers');
      await processDeletions('leads', currentDeletedItems.leads, 'leads');
      await processDeletions('products', currentDeletedItems.products, 'products');
      await processDeletions('orders', currentDeletedItems.orders, 'orders');
      await processDeletions('team', currentDeletedItems.team, 'team');
      await processDeletions('inventory', currentDeletedItems.inventory, 'inventory');
      await processDeletions('appointments', currentDeletedItems.appointments, 'appointments');
      await processDeletions('programs_414', currentDeletedItems.programs414, 'programs414');

      // 1. Clientes
      await syncTableItems('customers', currentCustomers, (c) => ({ name: c.name, phone: c.phone, city: c.city, notes: c.notes }), mapDBToCustomer, setCustomers, STORAGE_KEYS.CUSTOMERS);

      // 2. Leads
      await syncTableItems('leads', currentLeads, mapLeadToDB, mapDBToLead, setLeads, STORAGE_KEYS.LEADS);

      // 3. Pedidos
      await syncTableItems('orders', currentOrders, mapOrderToDB, mapDBToOrder, setOrders, STORAGE_KEYS.ORDERS);

      // 4. Agendamentos
      await syncTableItems('appointments', currentAppointments, mapAppointmentToDB, mapDBToAppointment, setAppointments, STORAGE_KEYS.APPOINTMENTS);

      // 5. Programas 4/14
      await syncTableItems('programs_414', currentPrograms, mapProgramToDB, mapDBToProgram, setPrograms414, STORAGE_KEYS.PROGRAMS_414);

      // 6. Produtos
      await syncTableItems('products', currentProducts, (p) => ({ name: p.name, description: p.description, price: p.price, category: p.category }), (p) => p as Product, setProducts, STORAGE_KEYS.PRODUCTS);

      // 7. Equipe
      await syncTableItems('team', currentTeam, (m) => ({ name: m.name, role: m.role, goals: m.goals, promotion_goal: m.promotionGoal, start_date: m.startDate }), mapDBToTeamMember, setTeam, STORAGE_KEYS.TEAM);

      // 8. Estoque
      await syncTableItems('inventory', currentInventory, mapInventoryToDB, mapDBToInventory, setInventory, STORAGE_KEYS.INVENTORY);

      // Limpar erros de sincronização APENAS se tudo deu certo
      if (!hasSyncErrors) {
        setLastSyncError(null);
      }
    } catch (e) {
      console.error("Erro na sincronização de fundo:", e);
      setLastSyncError(`Erro na sincronização: ${(e as Error).message}`);
    } finally {
      isSyncingRef.current = false;
    }
  }, [loading, deletedItems, session]);

  const setGoogleTokens = (tokens: any) => {
    setGoogleTokensState(tokens);
    saveLocal('sky_google_tokens', tokens);
  };

  const setGoogleMapsApiKey = (key: string) => {
    setGoogleMapsApiKeyInternal(key);
    saveLocal('sky_google_maps_key', key);
  };

  const syncToGoogleCalendar = async (event: Appointment) => {
    if (!googleTokens) return;
    try {
      const response = await fetch('/api/calendar/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: googleTokens, event })
      });
      if (!response.ok) throw new Error('Falha ao sincronizar');
      console.log('Evento sincronizado com Google');
    } catch (error) {
      console.error(error);
    }
  };

  const triggerSaveUpdate = useCallback(() => {
    const now = new Date().toISOString();
    setLastSaved(now);
    saveLocal('sky_last_saved', now);
    setSaving(true);
    setTimeout(() => setSaving(false), 1000);
  }, []);

  const lastSyncedSettingsRef = useRef<string>('');

  const syncSettings = useCallback(async () => {
    if (!isSupabaseReady || !supabase) return;
    try {
      const settingsData = {
        user_profile: userProfile,
        machine_fees: machineFees,
        pipeline_order: pipelineOrder,
        million_pipeline_order: millionPipelineOrder,
        sky_pipeline_order: skyPipelineOrder,
        dign_pipeline_order: dignPipelineOrder,
      };
      
      const currentString = JSON.stringify(settingsData);
      if (currentString === lastSyncedSettingsRef.current) return;
      
      lastSyncedSettingsRef.current = currentString;
      
      await supabase.from('app_settings').upsert({ 
        id: 'global', 
        ...settingsData,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn("Sincronização de configurações não disponível no banco de dados.");
    }
  }, [userProfile, machineFees, pipelineOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      syncSettings();
    }, 2000);
    return () => clearTimeout(timer);
  }, [userProfile, machineFees, pipelineOrder, syncSettings]);

  const fetchInitialData = useCallback(async (force = false) => {
    if (!isSupabaseReady || !supabase || !session) {
      setLoading(false);
      return;
    }

    // Evita múltiplas chamadas simultâneas ou muito frequentes (throttle de 5s)
    const nowTime = Date.now();
    if (isFetchingRef.current) return;
    if (!force && nowTime - lastFetchTimeRef.current < 5000) return;

    isFetchingRef.current = true;
    lastFetchTimeRef.current = nowTime;
    
    // Só mostra o loading screen se for a primeira carga ou se explicitamente forçado e ainda não tivermos dados
    const isFirstLoad = leads.length === 0 && customers.length === 0;
    if (isFirstLoad || (force && isFirstLoad)) {
      setLoading(true);
    }

    try {
      const results = await Promise.all([
        supabase.from('customers').select('*'),
        supabase.from('leads').select('*'),
        supabase.from('products').select('*'),
        supabase.from('inventory').select('*'),
        supabase.from('orders').select('*'),
        supabase.from('team').select('*'),
        supabase.from('appointments').select('*'),
        supabase.from('programs_414').select('*'),
        supabase.from('app_settings').select('*').eq('id', 'global').single()
      ]);

      const [cust, lea, prod, inv, ord, tea, appt, prog, sett] = results;

      if (sett.data) {
        if (sett.data.user_profile) {
          setUserProfile(sett.data.user_profile);
          saveLocal('sky_user_profile', sett.data.user_profile);
        }
        if (sett.data.machine_fees) {
          setMachineFees(sett.data.machine_fees);
          saveLocal('sky_settings_fees', sett.data.machine_fees);
        }
        if (sett.data.pipeline_order) {
          setPipelineOrder(sett.data.pipeline_order);
          saveLocal('sky_pipeline_order', sett.data.pipeline_order);
        }
        if (sett.data.million_pipeline_order) {
          setMillionPipelineOrder(sett.data.million_pipeline_order);
          saveLocal('sky_million_pipeline_order', sett.data.million_pipeline_order);
        }
        if (sett.data.sky_pipeline_order) {
          setSkyPipelineOrder(sett.data.sky_pipeline_order);
          saveLocal('sky_sky_pipeline_order', sett.data.sky_pipeline_order);
        }
        if (sett.data.dign_pipeline_order) {
          setDignPipelineOrder(sett.data.dign_pipeline_order);
          saveLocal('sky_dign_pipeline_order', sett.data.dign_pipeline_order);
        }
      }

      // Estratégia de Merge: Mantém o que é local e ainda não subiu, e atualiza com o que está na nuvem
      // Deduplicação: Se um item local (temp) tem o mesmo nome/telefone que um item da nuvem, assume que é o mesmo
      if (cust.data) {
        const mapped = cust.data.map(mapDBToCustomer).filter(c => !(deletedItems.customers || []).includes(c.id));
        setCustomers(prev => {
          const cloudIds = new Set(mapped.map(c => c.id));
          const cloudNames = new Set(mapped.map(c => `${c.name}|${c.phone}`));
          
          const localOnly = prev.filter(c => {
            if (cloudIds.has(c.id)) return false;
            if (isTemp(c.id) && cloudNames.has(`${c.name}|${c.phone}`)) return false;
            return true;
          });
          
          const merged = [...mapped, ...localOnly];
          saveLocal(STORAGE_KEYS.CUSTOMERS, merged);
          return merged;
        });
      }
      
      if (lea.data) {
        const mappedCloudLeads = lea.data.map(mapDBToLead).filter(l => !(deletedItems.leads || []).includes(l.id));
        setLeads(prev => {
          const cloudIds = new Set(mappedCloudLeads.map(l => l.id));
          const cloudNames = new Set(mappedCloudLeads.map(l => `${l.prospectName}|${l.prospectPhone}`));
          
          const localOnly = prev.filter(l => {
            if (cloudIds.has(l.id)) return false;
            if (isTemp(l.id) && cloudNames.has(`${l.prospectName}|${l.prospectPhone}`)) return false;
            return true;
          });
          
          const merged = [...mappedCloudLeads, ...localOnly];
          saveLocal(STORAGE_KEYS.LEADS, merged);
          return merged;
        });
      }

      if (prod.data) {
        setProducts(prev => {
          const filteredCloudProducts = prod.data!.filter(p => !(deletedItems.products || []).includes(p.id));
          const cloudIds = new Set(filteredCloudProducts.map(p => p.id));
          const localOnly = prev.filter(p => !cloudIds.has(p.id));
          const merged = [...filteredCloudProducts as any, ...localOnly];
          saveLocal(STORAGE_KEYS.PRODUCTS, merged);
          return merged;
        });
      }

      if (inv.data) {
        const mapped = inv.data.map(mapDBToInventory).filter(i => !(deletedItems.inventory || []).includes(i.id));
        setInventory(prev => {
          const cloudIds = new Set(mapped.map(i => i.id));
          const localOnly = prev.filter(i => !cloudIds.has(i.id));
          const merged = [...mapped, ...localOnly];
          saveLocal(STORAGE_KEYS.INVENTORY, merged);
          return merged;
        });
      }

      if (ord.data) {
        const mapped = ord.data.map(mapDBToOrder).filter(o => !(deletedItems.orders || []).includes(o.id));
        setOrders(prev => {
          const cloudIds = new Set(mapped.map(o => o.id));
          const cloudKeys = new Set(mapped.map(o => `${o.customerId}|${o.total}|${o.date}`));
          
          const localOnly = prev.filter(o => {
            if (cloudIds.has(o.id)) return false;
            if (isTemp(o.id) && cloudKeys.has(`${o.customerId}|${o.total}|${o.date}`)) return false;
            return true;
          });
          
          const merged = [...mapped, ...localOnly];
          saveLocal(STORAGE_KEYS.ORDERS, merged);
          return merged;
        });
      }

      if (tea.data) {
        const mapped = tea.data.map(mapDBToTeamMember).filter(t => !(deletedItems.team || []).includes(t.id));
        setTeam(prev => {
          const cloudIds = new Set(mapped.map(t => t.id));
          const localOnly = prev.filter(t => !cloudIds.has(t.id));
          const merged = [...mapped, ...localOnly];
          saveLocal(STORAGE_KEYS.TEAM, merged);
          return merged;
        });
      }

      if (appt.data) {
        const mapped = appt.data.map(mapDBToAppointment).filter(a => !(deletedItems.appointments || []).includes(a.id));
        setAppointments(prev => {
          const cloudIds = new Set(mapped.map(a => a.id));
          const cloudKeys = new Set(mapped.map(a => `${a.client}|${a.date}|${a.time}|${a.type}`));
          
          const localOnly = prev.filter(a => {
            if (cloudIds.has(a.id)) return false;
            if (isTemp(a.id) && cloudKeys.has(`${a.client}|${a.date}|${a.time}|${a.type}`)) return false;
            return true;
          });
          
          const merged = [...mapped, ...localOnly];
          saveLocal('sky_appointments', merged);
          return merged;
        });
      }

      if (prog.data) {
        const mapped = prog.data.map(mapDBToProgram).filter(p => !(deletedItems.programs414 || []).includes(p.id));
        setPrograms414(prev => {
          const cloudIds = new Set(mapped.map(p => p.id));
          const localOnly = prev.filter(p => !cloudIds.has(p.id));
          const merged = [...mapped, ...localOnly];
          saveLocal(STORAGE_KEYS.PROGRAMS_414, merged);
          return merged;
        });
      }

      // Atualiza o timestamp de sincronização SEMPRE que o fetch terminar com sucesso
      const now = new Date().toISOString();
      setLastSaved(now);
      saveLocal('sky_last_saved', now);
      setLastSyncError(null);
      
    } catch (error: any) {
      console.error("Erro Supabase Sync:", error);
      const msg = error.message || "Erro desconhecido na sincronização";
      setLastSyncError(msg);
      throw error; // Repassa para quem chamou (ex: saveProgress)
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [session, deletedItems]);

  const testCloudConnection = async () => {
    if (!isSupabaseReady || !supabase) {
      alert("Configuração ausente: Verifique SUPABASE_URL e SUPABASE_ANON_KEY");
      return;
    }
    
    setSaving(true);
    try {
      const { data, error } = await supabase!.from('leads').select('count', { count: 'exact', head: true });
      if (error) throw error;
      alert(`Conexão OK! Encontrados ${data?.length || 0} registros na nuvem.`);
    } catch (error: any) {
      alert(`Erro de Conexão: ${error.message}`);
      setLastSyncError(error.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchInitialData(true);
  }, [fetchInitialData]);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase!.auth.getSession();
      console.log('SKY MANAGER: Sessão inicial:', session?.user?.email);
      setSession(session);
    }
    getSession();

    const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, session) => {
      console.log(`SKY MANAGER: Mudança de estado Auth: ${_event}`, session?.user?.email);
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSupabaseReady || !supabase) return;

    const handleFocus = () => {
      // Sincroniza ao voltar para o app, mas respeita o throttle do fetchInitialData
      fetchInitialData();
      syncPendingData();
    };

    window.addEventListener('focus', handleFocus);
    const interval = setInterval(() => {
      syncPendingData();
      fetchInitialData();
    }, 60000); // Sincroniza a cada 1 minuto

    // Dispara sincronização inicial e quando há itens pendentes
    fetchInitialData();
    if (pendingCount > 0) {
      syncPendingData();
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [syncPendingData, pendingCount, fetchInitialData]);

  useEffect(() => {
    if (session) {
      fetchInitialData(true);
    }
  }, [session, fetchInitialData]);

  const addLead = async (l: Omit<Lead, 'id'>) => {
    const localId = 'temp_' + Math.random().toString(36).substr(2, 9);
    const localLead: Lead = { 
      ...l, 
      id: localId,
      pipelineType: l.pipelineType || 'new'
    };
    const newLeads = [...leads, localLead];
    setLeads(newLeads);
    saveLocal(STORAGE_KEYS.LEADS, newLeads);
    triggerSaveUpdate();
  };

  const processPhone = (fone: string, celular: string) => {
    const clean = (s: string) => s?.replace(/\D/g, '') || '';
    let f = clean(fone);
    let c = clean(celular);
    
    // Prioriza o celular, se não tiver, pega o fixo
    let target = c.length >= 8 ? c : (f.length >= 8 ? f : (c || f));
    if (!target) return '';

    // Se o número vier com o 55 no início, remove temporariamente para tratar o DDD/9º dígito
    if (target.startsWith('55') && target.length > 10) {
      target = target.substring(2);
    }

    // Se tem 10 dígitos (DDD + 8 números)
    if (target.length === 10) {
      const ddd = target.substring(0, 2);
      const numberPart = target.substring(2);
      // Se o número começa com 6-9, é celular e precisa do 9 na frente
      if (/^[6-9]/.test(numberPart)) {
        target = ddd + '9' + numberPart;
      }
    }

    // Se faltar o 55, adiciona
    if (!target.startsWith('55')) {
      target = '55' + target;
    }
    
    return target;
  };

  const importMillionLeads = async (silent = false) => {
    console.log("SKY MANAGER: Iniciando importação Million...");
    try {
      const { MILLION_LEADS } = await import('../src/data/millionLeads');
      if (!MILLION_LEADS) {
        console.error("SKY MANAGER: MILLION_LEADS não encontrado no arquivo.");
        return;
      }

      const lines = MILLION_LEADS.trim().split('\n').slice(1);
      console.log(`SKY MANAGER: Processando ${lines.length} linhas...`);

      setLeads(prev => {
        const leadsMap = new Map(prev.map(l => [l.prospectPhone, l]));
        let count = 0;
        let updatedCount = 0;

        for (const line of lines) {
          // MillionLeads usa vírgula
          const parts = line.split(',');
          if (parts.length < 3) continue;
          
          const [nome, cidade, fone] = parts;
          if (!nome || nome.trim() === '') continue;

          const whatsapp = processPhone('', fone);
          if (!whatsapp) continue;
          
          const tag = '[PIPELINE_MILLION]';
          
          if (leadsMap.has(whatsapp)) {
            const existing = leadsMap.get(whatsapp)!;
            if (existing.pipelineType !== 'million') {
              leadsMap.set(whatsapp, { 
                ...existing, 
                pipelineType: 'million', 
                stage: CustomerPipelineStage.CLIENTES_MILLION,
                prospectNotes: `${tag}\nImportado Million\n` + (existing.prospectNotes || '')
              });
              updatedCount++;
            }
          } else {
            const localId = 'temp_' + Math.random().toString(36).substr(2, 9);
            leadsMap.set(whatsapp, {
              id: localId,
              prospectName: nome.trim(),
              prospectPhone: whatsapp,
              prospectCity: cidade.trim(),
              stage: CustomerPipelineStage.CLIENTES_MILLION,
              pipelineType: 'million',
              productInterest: 'Importação Million',
              prospectNotes: `${tag}\nImportado Million`,
              estimatedValue: 0,
              lastInteraction: new Date().toISOString(),
              nextContactDate: '',
              assignedTo: 'admin'
            });
            count++;
          }
        }

        if (count > 0 || updatedCount > 0) {
          const updatedLeads = Array.from(leadsMap.values());
          saveLocal(STORAGE_KEYS.LEADS, updatedLeads);
          setTimeout(() => triggerSaveUpdate(), 100);
          if (!silent) {
            alert(`${count} novos leads importados e ${updatedCount} leads movidos para o pipeline Million!`);
          }
          console.log(`SKY MANAGER: ${count} leads importados, ${updatedCount} movidos.`);
          return updatedLeads;
        }
        
        console.log("SKY MANAGER: Nenhum lead novo para importar.");
        return prev;
      });
    } catch (err) {
      console.error("SKY MANAGER: Erro na importação Million:", err);
    }
  };

  const importDignLeads = async (silent = false) => {
    console.log("SKY MANAGER: Iniciando importação DIGN...");
    try {
      const { DIGN_LEADS } = await import('../src/data/dignLeads');
      if (!DIGN_LEADS) {
        console.error("SKY MANAGER: DIGN_LEADS não encontrado no arquivo.");
        return;
      }

      const lines = DIGN_LEADS.trim().split('\n').slice(1);
      console.log(`SKY MANAGER: Processando ${lines.length} linhas...`);
      
      setLeads(prev => {
        const leadsMap = new Map(prev.map(l => [l.prospectPhone, l]));
        let count = 0;
        let updatedCount = 0;

        for (const line of lines) {
          // Split by semicolon
          const parts = line.split(';');
          if (parts.length < 4) continue;
          
          const [nome, cidade, telRes, celular, ordens] = parts;
          if (!nome || nome.trim() === '') continue;

          const whatsapp = processPhone(telRes, celular);
          if (!whatsapp) continue;
          
          const tag = '[PIPELINE_DIGN]';
          const notesText = ordens ? `${tag}\nProdutos: ${ordens}` : `${tag}\nImportado DIGN`;
          
          if (leadsMap.has(whatsapp)) {
            const existing = leadsMap.get(whatsapp)!;
            if (existing.pipelineType !== 'dign') {
              leadsMap.set(whatsapp, { 
                ...existing, 
                pipelineType: 'dign', 
                stage: CustomerPipelineStage.CLIENTES_DIGN,
                prospectNotes: notesText + '\n' + (existing.prospectNotes || '')
              });
              updatedCount++;
            }
          } else {
            const localId = 'temp_' + Math.random().toString(36).substr(2, 9);
            leadsMap.set(whatsapp, {
              id: localId,
              prospectName: nome.trim(),
              prospectPhone: whatsapp,
              prospectCity: cidade.trim(),
              stage: CustomerPipelineStage.CLIENTES_DIGN,
              pipelineType: 'dign',
              productInterest: 'Importação DIGN',
              prospectNotes: notesText,
              estimatedValue: 0,
              lastInteraction: new Date().toISOString(),
              nextContactDate: '',
              assignedTo: 'admin'
            });
            count++;
          }
        }

        if (count > 0 || updatedCount > 0) {
          const updatedLeads = Array.from(leadsMap.values());
          saveLocal(STORAGE_KEYS.LEADS, updatedLeads);
          setTimeout(() => triggerSaveUpdate(), 100);
          if (!silent) {
            alert(`${count} novos leads importados e ${updatedCount} leads movidos para o pipeline DIGN!`);
          }
          console.log(`SKY MANAGER: ${count} leads importados, ${updatedCount} movidos.`);
          return updatedLeads;
        }
        
        console.log("SKY MANAGER: Nenhum lead novo para importar.");
        return prev;
      });
    } catch (err) {
      console.error("SKY MANAGER: Erro na importação DIGN:", err);
      if (!silent) alert(`Erro ao importar leads: ${err}`);
    }
  };

  const importSkyLeads = async (silent = false) => {
    console.log("SKY MANAGER: Iniciando importação/atualização SKY...");
    try {
      const { SKY_LEADS } = await import('../src/data/skyLeads');
      const { translateProduct } = await import('../src/data/productMapping');
      
      if (!SKY_LEADS) {
        console.error("SKY MANAGER: SKY_LEADS não encontrado.");
        return;
      }

      const lines = SKY_LEADS.trim().split('\n').slice(1);
      console.log(`SKY MANAGER: Processando ${lines.length} linhas da SKY...`);
      
      setLeads(prev => {
        const leadsMap = new Map(prev.map(l => [l.prospectPhone, l]));
        let count = 0;
        let updatedCount = 0;

        for (const line of lines) {
          const parts = line.split(';');
          if (parts.length < 3) {
            console.warn("SKY MANAGER: Linha inválida (poucas partes):", line);
            continue;
          }
          
          const [nome, cidade, fone, celular, extra0, extra1] = parts;
          if (!nome || nome.trim() === '') continue;

          const whatsapp = processPhone(fone, celular);
          if (!whatsapp) {
            console.warn("SKY MANAGER: Telefone inválido para:", nome);
            continue;
          }

          const tag = '[PIPELINE_SKY]';
          // Captura possíveis colunas de ordens/produtos se sobrareim (colunas 5 e 6)
          const infoExtra = [extra0, extra1].filter(Boolean).join(', ');
          const notesText = infoExtra ? `${tag}\nHistórico: ${infoExtra}\nImportado SKY` : `${tag}\nImportado SKY`;

          if (leadsMap.has(whatsapp)) {
            // Atualiza lead existente para o pipeline correto APENAS se não for Million ou Dign
            const existing = leadsMap.get(whatsapp)!;
            const notes = (existing.prospectNotes || '').toLowerCase();
            const isMillion = notes.includes('million');
            const isDign = notes.includes('dign') || notes.includes('digne');

            if (!isMillion && !isDign && existing.pipelineType !== 'sky') {
              console.log("SKY MANAGER: Movendo lead existente para SKY:", nome);
              leadsMap.set(whatsapp, { 
                ...existing, 
                pipelineType: 'sky', 
                stage: CustomerPipelineStage.CLIENTES_SKY,
                prospectNotes: notesText + '\n' + (existing.prospectNotes || '')
              });
              updatedCount++;
            }
          } else {
            // Cria novo lead
            console.log("SKY MANAGER: Criando novo lead SKY:", nome);
            const localId = 'temp_' + Math.random().toString(36).substr(2, 9);
            leadsMap.set(whatsapp, {
              id: localId,
              prospectName: nome.trim(),
              prospectPhone: whatsapp,
              prospectCity: cidade.trim(),
              stage: CustomerPipelineStage.CLIENTES_SKY,
              pipelineType: 'sky',
              productInterest: 'Upgrade / Novos Produtos',
              prospectNotes: notesText,
              estimatedValue: 0,
              lastInteraction: new Date().toISOString(),
              nextContactDate: '',
              assignedTo: 'admin'
            });
            count++;
          }
        }

        if (count > 0 || updatedCount > 0) {
          const updatedLeads = Array.from(leadsMap.values());
          saveLocal(STORAGE_KEYS.LEADS, updatedLeads);
          setTimeout(() => triggerSaveUpdate(), 100);
          if (!silent) alert(`${count} novos leads importados e ${updatedCount} leads movidos para o pipeline SKY.`);
          return updatedLeads;
        }
        return prev;
      });
    } catch (err) {
      console.error("SKY MANAGER: Erro na importação:", err);
    }
  };

  // Função para mover leads para o pipeline correto (DIGN, Million ou SKY)
  const fixPipelineLeads = () => {
    setLeads(prev => {
      let movedCount = 0;
      const updated = prev.map(l => {
        let targetType = l.pipelineType;
        const notes = (l.prospectNotes || '').toUpperCase();
        const stageUpper = l.stage.toUpperCase();
        const interest = (l.productInterest || '').toUpperCase();
        
        // Critério Estrito do Usuário:
        if (notes.includes('IMPORTADO MILLION') || notes.includes('MILLION')) {
          targetType = 'million';
        } else if (notes.includes('DIGNE') || notes.includes('DIGN')) {
          targetType = 'dign';
        } else if (stageUpper.includes('SKY') || stageUpper === 'PRODUTOS' || interest.includes('ROYAL') || interest.includes('PRESTIGE')) {
          targetType = 'sky';
        }

        if (targetType !== l.pipelineType) {
          movedCount++;
          let targetStage = l.stage;
          if (targetType === 'sky') targetStage = CustomerPipelineStage.CLIENTES_SKY;
          else if (targetType === 'million') targetStage = CustomerPipelineStage.CLIENTES_MILLION;
          else if (targetType === 'dign') targetStage = CustomerPipelineStage.CLIENTES_DIGN;

          return { ...l, pipelineType: targetType, stage: targetStage as any };
        }
        return l;
      });

      if (movedCount > 0) {
        saveLocal(STORAGE_KEYS.LEADS, updated);
        triggerSaveUpdate();
        alert(`${movedCount} leads foram reorganizados com base no critério estrito de notas.`);
      } else {
        alert("Todos os leads já estão nos pipelines corretos de acordo com as notas.");
      }
      return updated;
    });
  };

  const moveLeadsBetweenPipelines = (from: 'million' | 'sky' | 'dign', to: 'million' | 'sky' | 'dign') => {
    setLeads(prev => {
      let movedCount = 0;
      const updated = prev.map(l => {
        if (l.pipelineType === from) {
          movedCount++;
          const targetStage = to === 'sky' ? CustomerPipelineStage.CLIENTES_SKY : (to === 'million' ? CustomerPipelineStage.CLIENTES_MILLION : CustomerPipelineStage.CLIENTES_DIGN);
          return { ...l, pipelineType: to, stage: targetStage };
        }
        return l;
      });

      if (movedCount > 0) {
        saveLocal(STORAGE_KEYS.LEADS, updated);
        triggerSaveUpdate();
        alert(`${movedCount} leads foram movidos de ${from.toUpperCase()} para ${to.toUpperCase()}.`);
      } else {
        alert(`Nenhum lead encontrado no pipeline ${from.toUpperCase()}.`);
      }
      return updated;
    });
  };

  const clearPipelineLeads = (type: 'million' | 'sky' | 'dign') => {
    if (!confirm(`TEM CERTEZA? Isso excluirá TODOS os leads do pipeline ${type.toUpperCase()} permanentemente.`)) return;
    
    setLeads(prev => {
      const updated = prev.filter(l => l.pipelineType !== type);
      saveLocal(STORAGE_KEYS.LEADS, updated);
      triggerSaveUpdate();
      alert(`Pipeline ${type.toUpperCase()} limpo com sucesso.`);
      return updated;
    });
  };

  const importLeadsFromRawText = async (text: string, type: 'million' | 'sky' | 'dign') => {
    console.log(`SKY MANAGER: Iniciando importação manual para pipeline: ${type}...`);
    try {
      const { translateProduct } = await import('../src/data/productMapping');
      
      if (!text || text.trim() === "") {
        alert("Por favor, cole os dados para importar.");
        return;
      }

      // Normaliza quebras de linha e remove linhas vazias
      const lines = text.replace(/\r\n/g, '\n').split('\n').filter(line => line.trim() !== "");
      
      // Se a primeira linha parecer um cabeçalho, removemos
      if (lines.length > 0 && (lines[0].toUpperCase().includes('NOME') || lines[0].toUpperCase().includes('CIDADE') || lines[0].toUpperCase().includes('TEL'))) {
        lines.shift();
      }
      
      setLeads(prev => {
        const leadsMap = new Map(prev.map(l => [l.prospectPhone, l]));
        let count = 0;
        let updatedCount = 0;

        for (const line of lines) {
          // Detecta delimitador (ponto e vírgula é comum em CSVs brasileiros de Excel)
          const delimiter = line.includes(';') ? ';' : (line.includes('\t') ? '\t' : ',');
          const parts = line.split(delimiter).map(p => p.trim());
          
          if (parts.length < 1 || !parts[0]) continue; // Mínimo: Nome
          
          let nome = parts[0] || 'Sem Nome';
          let cidade = '';
          let telRes = '';
          let celular = '';
          let ordens = '';

          // Identifica telefones em qualquer coluna (exceto a primeira que é o nome)
          const possiblePhones = parts.slice(1).filter(p => {
            const digits = p.replace(/\D/g, '');
            return digits.length >= 8 && digits.length <= 13;
          });

          if (possiblePhones.length > 0) {
            celular = possiblePhones[possiblePhones.length - 1];
            if (possiblePhones.length > 1) {
              telRes = possiblePhones[0];
            }
          }

          // Identifica cidade e ordens (o que não for telefone e não for vazio)
          const nonPhones = parts.slice(1).filter(p => !possiblePhones.includes(p) && p !== '');
          if (nonPhones.length > 0) {
            cidade = nonPhones[0];
          }
          if (nonPhones.length > 1) {
            ordens = nonPhones.slice(1).join(', ');
          }

          const cleanPhone = processPhone(telRes, celular);
          
          // Gera uma chave única: usa o telefone se existir, senão usa nome + timestamp para não perder o lead
          const uniqueKey = cleanPhone && cleanPhone.length >= 8 ? cleanPhone : `${nome.replace(/\s/g, '_')}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

          // Traduz produtos usando o mapeamento se for SKY
          let notes = `Importado em ${new Date().toLocaleDateString()}`;
          if (type === 'sky') {
            const produtosPossuidos = ordens ? ordens.split(',').map(p => translateProduct(p.trim())).join(', ') : '';
            notes = produtosPossuidos ? `Cliente já possui: ${produtosPossuidos}` : 'Cliente sem produtos registrados.';
          } else if (ordens) {
            notes = `Produtos: ${ordens}`;
          }
          
          // Adiciona tag de importação para ajudar na filtragem futura
          notes += ` [Importado ${type === 'million' ? 'Million' : (type === 'dign' ? 'Digne' : 'Sky')}]`;

          if (leadsMap.has(uniqueKey)) {
            const existing = leadsMap.get(uniqueKey)!;
            leadsMap.set(uniqueKey, { 
              ...existing, 
              pipelineType: type, 
              prospectNotes: notes + '\n' + (existing.prospectNotes || ''),
              stage: type === 'sky' ? CustomerPipelineStage.CLIENTES_SKY : (type === 'million' ? CustomerPipelineStage.CLIENTES_MILLION : CustomerPipelineStage.CLIENTES_DIGN)
            });
            updatedCount++;
          } else {
            const localId = 'temp_' + Math.random().toString(36).substr(2, 9);
            leadsMap.set(uniqueKey, {
              id: localId,
              prospectName: nome,
              prospectPhone: cleanPhone || '',
              prospectCity: cidade,
              stage: type === 'sky' ? CustomerPipelineStage.CLIENTES_SKY : (type === 'million' ? CustomerPipelineStage.CLIENTES_MILLION : CustomerPipelineStage.CLIENTES_DIGN),
              pipelineType: type,
              productInterest: type === 'sky' ? 'Upgrade / Novos Produtos' : 'Interesse Geral',
              prospectNotes: notes,
              estimatedValue: 0,
              lastInteraction: new Date().toISOString(),
              nextContactDate: '',
              assignedTo: 'admin'
            });
            count++;
          }
        }

        const updatedLeads = Array.from(leadsMap.values());
        saveLocal(STORAGE_KEYS.LEADS, updatedLeads);
        triggerSaveUpdate();
        
        setTimeout(() => {
          alert(`Importação concluída!\n- ${count} novos leads adicionados\n- ${updatedCount} leads existentes atualizados para o pipeline ${type.toUpperCase()}`);
        }, 100);

        return updatedLeads;
      });
    } catch (err) {
      console.error("SKY MANAGER: Erro na importação manual:", err);
      alert("Erro ao processar os dados. Verifique o formato.");
    }
  };

  const updateLead = async (lead: Lead) => {
    const newLeads = leads.map(l => l.id === lead.id ? lead : l);
    setLeads(newLeads);
    saveLocal(STORAGE_KEYS.LEADS, newLeads);
    triggerSaveUpdate();
    if (!isTemp(lead.id) && isSupabaseReady && supabase) {
      supabase.from('leads').update(mapLeadToDB(lead)).eq('id', lead.id).then();
    }
  };

  const updateLeadStage = async (leadId: string, newStage: string) => {
    const updated = leads.map(l => l.id === leadId ? { ...l, stage: newStage, lastInteraction: new Date().toISOString() } : l);
    setLeads(updated);
    saveLocal(STORAGE_KEYS.LEADS, updated);
    triggerSaveUpdate();
    if (!isTemp(leadId) && isSupabaseReady && supabase) {
      const lead = updated.find(l => l.id === leadId);
      if (lead) supabase.from('leads').update(mapLeadToDB(lead)).eq('id', leadId).then();
    }
  };

  const createOrder = async (o: Omit<Order, 'id'>) => {
    const localId = 'ord_' + Math.random().toString(36).substr(2, 9);
    const newOrder = { ...o, id: localId };
    const newOrders = [...orders, newOrder];
    setOrders(newOrders);
    saveLocal(STORAGE_KEYS.ORDERS, newOrders);
    triggerSaveUpdate();

    if (o.orderType !== 'history') {
      const customer = customers.find(c => c.id === o.customerId);
      if (customer) {
        await addLead({
          customerId: customer.id,
          prospectName: customer.name,
          prospectPhone: customer.phone,
          prospectCity: customer.city,
          prospectAddress: '',
          prospectNotes: `Faturamento registrado em ${new Date(o.date).toLocaleDateString()}. Tipo: ${o.orderType || 'Normal'}.`,
          stage: PipelineStage.ADD_ON,
          productInterest: o.orderType === 'addon' ? 'Recompra / Add-on' : 'Venda Nova',
          estimatedValue: o.total,
          lastInteraction: new Date().toISOString(),
          nextContactDate: '',
          pipelineType: o.orderType === 'addon' ? 'rebuy' : 'sky',
          assignedTo: o.salespersonId || 'admin'
        });
      }
    }


  };

  const updateOrder = async (o: Order) => {
    const updated = orders.map(x => x.id === o.id ? o : x);
    setOrders(updated);
    saveLocal(STORAGE_KEYS.ORDERS, updated);
    triggerSaveUpdate();
    if (!isTemp(o.id) && isSupabaseReady && supabase) {
      supabase.from('orders').update(mapOrderToDB(o)).eq('id', o.id).then();
    }
  };

  const addCustomer = async (c: Omit<Customer, 'id' | 'interactions' | 'orders'>): Promise<string | null> => {
    const localId = 'cust_' + Math.random().toString(36).substr(2, 9);
    const localCustomer = { 
      ...c, 
      id: localId, 
      interactions: [], 
      orders: [],
      lastContactDate: new Date().toISOString()
    };
    const newCusts = [...customers, localCustomer];
    setCustomers(newCusts);
    saveLocal(STORAGE_KEYS.CUSTOMERS, newCusts);
    triggerSaveUpdate();
    return localId;
  };

  const registerBiometrics = async () => {
    if (!session?.user?.email) {
      alert('Você precisa estar logado para registrar a biometria.');
      return;
    }

    try {
      const resp = await fetch(`/api/auth/biometrics/register-options?email=${encodeURIComponent(session.user.email)}`);
      const options = await resp.json();

      const attestation = await startRegistration(options);

      await fetch(`/api/auth/biometrics/verify-registration?email=${encodeURIComponent(session.user.email)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attestation),
      });

      alert('Biometria registrada com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Falha ao registrar biometria.');
    }
  };

  const loginBiometrics = async (email?: string) => {
    const targetEmail = email || prompt('Por favor, insira seu e-mail para login biométrico:');
    if (!targetEmail) return;

    try {
      const resp = await fetch(`/api/auth/biometrics/login-options?email=${encodeURIComponent(targetEmail)}`);
      const options = await resp.json();

      const assertion = await startAuthentication(options);

      const verificationResp = await fetch(`/api/auth/biometrics/verify-login?email=${encodeURIComponent(targetEmail)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assertion),
      });

      const verification = await verificationResp.json();

      if (verification.verified) {
        // Em um app real, o servidor criaria uma sessão aqui.
        // Como estamos usando o Supabase, vamos apenas recarregar a página para que o `onAuthStateChange` pegue a sessão.
        window.location.reload();
      } else {
        alert('Falha na autenticação biométrica.');
      }
    } catch (error) {
      console.error(error);
      alert('Falha ao fazer login com biometria.');
    }
  };
  const addTeamMember = async (m: Omit<TeamMember, 'id' | 'salesVolume' | 'totalVolume' | 'progressToPromotion'>) => {
    const localId = 'tm_' + Math.random().toString(36).substr(2, 9);
    const localMember: TeamMember = {
      ...m,
      id: localId,
      salesVolume: 0,
      totalVolume: 0,
      progressToPromotion: 0
    };
    const newTeam = [...team, localMember];
    setTeam(newTeam);
    saveLocal(STORAGE_KEYS.TEAM, newTeam);
    triggerSaveUpdate();
  };

  const toggleAppointmentStatus = async (id: string) => {
    const updated = appointments.map(x => x.id === id ? { ...x, completed: !x.completed } : x);
    setAppointments(updated);
    saveLocal('sky_appointments', updated);
    triggerSaveUpdate();
    if (!isTemp(id) && isSupabaseReady && supabase) {
      const appt = updated.find(a => a.id === id);
      if (appt) supabase.from('appointments').update(mapAppointmentToDB(appt)).eq('id', id).then();
    }
  };

  // Funções simplificadas para outros métodos
  const updatePipelineOrder = async (newOrder: string[], type: 'new' | 'million' | 'sky' | 'dign' = 'new') => {
    if (type === 'new') {
      setPipelineOrder(newOrder as PipelineStage[]);
      saveLocal('sky_pipeline_order', newOrder);
    } else if (type === 'million') {
      setMillionPipelineOrder(newOrder);
      saveLocal('sky_million_pipeline_order', newOrder);
    } else if (type === 'sky') {
      setSkyPipelineOrder(newOrder);
      saveLocal('sky_sky_pipeline_order', newOrder);
    } else if (type === 'dign') {
      setDignPipelineOrder(newOrder);
      saveLocal('sky_dign_pipeline_order', newOrder);
    }
    triggerSaveUpdate();
  };

  const renamePipelineStage = async (oldName: string, newName: string, type: 'new' | 'million' | 'sky' | 'dign' = 'new') => {
    // 1. Atualizar a ordem do pipeline
    let currentOrder: string[] = [];
    if (type === 'new') currentOrder = pipelineOrder;
    else if (type === 'million') currentOrder = millionPipelineOrder;
    else if (type === 'sky') currentOrder = skyPipelineOrder;
    else if (type === 'dign') currentOrder = dignPipelineOrder;

    const newOrder = currentOrder.map(stage => stage === oldName ? newName : stage);
    
    if (type === 'new') {
      setPipelineOrder(newOrder as PipelineStage[]);
      saveLocal('sky_pipeline_order', newOrder);
    } else if (type === 'million') {
      setMillionPipelineOrder(newOrder);
      saveLocal('sky_million_pipeline_order', newOrder);
    } else if (type === 'sky') {
      setSkyPipelineOrder(newOrder);
      saveLocal('sky_sky_pipeline_order', newOrder);
    } else if (type === 'dign') {
      setDignPipelineOrder(newOrder);
      saveLocal('sky_dign_pipeline_order', newOrder);
    }
    
    // 2. Atualizar todos os leads que estão nessa etapa
    const updatedLeads = leads.map(lead => 
      lead.stage === oldName ? { ...lead, stage: newName as any } : lead
    );
    setLeads(updatedLeads);
    saveLocal(STORAGE_KEYS.LEADS, updatedLeads);
    
    triggerSaveUpdate();
  };

  const updateMachineFees = async (fees: number[]) => {
    setMachineFees(fees);
    saveLocal('sky_settings_fees', fees);
    triggerSaveUpdate();
  };

  const resetApp = async () => {
    localStorage.clear();
    window.location.reload();
  };

  const importBackup = async (json: string) => {
    console.log("SKY MANAGER: Iniciando resgate de dados...");
    try {
      // 1. Limpeza e normalização extrema
      const sanitized = json
        .replace(/nulo/g, 'null')
        .replace(/\\n/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\\"/g, '"')
        .replace(/{{/g, '{')
        .trim();

      let recoveredLeads: any[] = [];
      
      // 2. Scanner agressivo de Leads
      // Procura por blocos que contenham prospectName e id
      const blocks = sanitized.split('{"prospectName"');
      blocks.forEach(block => {
        if (!block.trim()) return;
        
        const fullBlock = '{"prospectName"' + block;
        // Tenta encontrar o fim do objeto procurando pelo ID
        const idMatch = fullBlock.match(/,"id":"(temp_.*?|.*?)"/);
        if (idMatch) {
          const endIndex = fullBlock.indexOf(idMatch[0]) + idMatch[0].length + 1;
          let potentialJson = fullBlock.substring(0, endIndex);
          if (!potentialJson.endsWith('}')) potentialJson += '}';

          try {
            // Tenta parsar o bloco
            const lead = JSON.parse(potentialJson);
            if (lead.prospectName) recoveredLeads.push(lead);
          } catch (e) {
            // Se falhar, tenta extrair campos via Regex (Último recurso)
            const name = potentialJson.match(/"prospectName":"(.*?)"/)?.[1];
            const phone = potentialJson.match(/"prospectPhone":"(.*?)"/)?.[1];
            const id = potentialJson.match(/"id":"(.*?)"/)?.[1];
            const stage = potentialJson.match(/"stage":"(.*?)"/)?.[1];
            
            if (name && id) {
              recoveredLeads.push({
                id,
                prospectName: name,
                prospectPhone: phone || "",
                stage: stage || "Leads",
                lastInteraction: new Date().toISOString(),
                pipelineType: 'new'
              });
            }
          }
        }
      });

      if (recoveredLeads.length > 0) {
        localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(recoveredLeads));
        alert(`RESGATE CONCLUÍDO!\n\nRecuperamos ${recoveredLeads.length} Leads do seu backup.\n\nO sistema irá reiniciar para mostrar os dados.`);
        window.location.reload();
      } else {
        alert("Não foi possível encontrar dados válidos no texto colado. Verifique se copiou o backup completo.");
      }
    } catch (e) {
      console.error("Erro no resgate:", e);
      alert("Falha ao processar o texto. Tente copiar novamente do celular.");
    }
  };

  const updateUserProfile = async (profile: UserProfile) => {
    setUserProfile(profile);
    saveLocal('sky_user_profile', profile);
  };

  const saveProgress = () => {
    setSaving(true);
    setLastSyncError(null);
    fetchInitialData(true).then(() => {
      syncPendingData().then(() => {
        const now = new Date().toISOString();
        setLastSaved(now);
        saveLocal('sky_last_saved', now);
        setSaving(false);
        // Só avisa sucesso se realmente não houver erro pendente
        if (stateRef.current.pendingCount === 0) {
          alert("Sincronização completa com a nuvem!");
        } else {
          alert("Alguns itens não puderam ser sincronizados. Verifique os erros no topo da tela.");
        }
      });
    }).catch(err => {
      setSaving(false);
      setLastSyncError("Falha na sincronização manual");
    });
  };

  // Implementação do addReferralToProgram para gerenciar indicações no desafio 4/14
  const addReferralToProgram = async (programId: string, lead: Omit<Lead, 'id'>) => {
    const localLeadId = 'temp_lead_' + Math.random().toString(36).substr(2, 9);
    const newLead: Lead = { ...lead, id: localLeadId };
    const updatedLeads = [...leads, newLead];
    setLeads(updatedLeads);
    saveLocal(STORAGE_KEYS.LEADS, updatedLeads);

    const updatedPrograms = programs414.map(p => {
      if (p.id === programId) {
        return { ...p, referralIds: [...(p.referralIds || []), localLeadId] };
      }
      return p;
    });
    setPrograms414(updatedPrograms);
    saveLocal(STORAGE_KEYS.PROGRAMS_414, updatedPrograms);
  };

  const removeCustomer = async (id: string) => {
    const updated = customers.filter(x => x.id !== id);
    setCustomers(updated);
    saveLocal(STORAGE_KEYS.CUSTOMERS, updated);
    setDeletedItems(prev => ({ ...prev, customers: [...(prev.customers || []), id] }));
    saveLocal(STORAGE_KEYS.DELETED_ITEMS, { ...deletedItems, customers: [...(deletedItems.customers || []), id] });
    triggerSaveUpdate();
  };

  const removeLead = async (id: string) => {
    const updated = leads.filter(x => x.id !== id);
    setLeads(updated);
    saveLocal(STORAGE_KEYS.LEADS, updated);
    setDeletedItems(prev => ({ ...prev, leads: [...(prev.leads || []), id] }));
    saveLocal(STORAGE_KEYS.DELETED_ITEMS, { ...deletedItems, leads: [...(deletedItems.leads || []), id] });
    triggerSaveUpdate();
  };

  const removeOrder = async (id: string) => {
    const updated = orders.filter(x => x.id !== id);
    setOrders(updated);
    saveLocal(STORAGE_KEYS.ORDERS, updated);
    setDeletedItems(prev => ({ ...prev, orders: [...(prev.orders || []), id] }));
    saveLocal(STORAGE_KEYS.DELETED_ITEMS, { ...deletedItems, orders: [...(deletedItems.orders || []), id] });
    triggerSaveUpdate();
  };

  const removeAppointment = async (id: string) => {
    const updated = appointments.filter(x => x.id !== id);
    setAppointments(updated);
    saveLocal('sky_appointments', updated);
    setDeletedItems(prev => ({ ...prev, appointments: [...(prev.appointments || []), id] }));
    saveLocal(STORAGE_KEYS.DELETED_ITEMS, { ...deletedItems, appointments: [...(deletedItems.appointments || []), id] });
    triggerSaveUpdate();
  };

  const removeTeamMember = async (id: string) => {
    const updated = team.filter(x => x.id !== id);
    setTeam(updated);
    saveLocal(STORAGE_KEYS.TEAM, updated);
    setDeletedItems(prev => ({ ...prev, team: [...(prev.team || []), id] }));
    saveLocal(STORAGE_KEYS.DELETED_ITEMS, { ...deletedItems, team: [...(deletedItems.team || []), id] });
    triggerSaveUpdate();
  };

  const removeProduct = async (id: string) => {
    const updated = products.filter(x => x.id !== id);
    setProducts(updated);
    saveLocal(STORAGE_KEYS.PRODUCTS, updated);
    setDeletedItems(prev => ({ ...prev, products: [...(prev.products || []), id] }));
    saveLocal(STORAGE_KEYS.DELETED_ITEMS, { ...deletedItems, products: [...(deletedItems.products || []), id] });
    triggerSaveUpdate();
  };

  const removeInventoryItem = async (id: string) => {
    const updated = inventory.filter(x => x.id !== id);
    setInventory(updated);
    saveLocal(STORAGE_KEYS.INVENTORY, updated);
    setDeletedItems(prev => ({ ...prev, inventory: [...(prev.inventory || []), id] }));
    saveLocal(STORAGE_KEYS.DELETED_ITEMS, { ...deletedItems, inventory: [...(deletedItems.inventory || []), id] });
    triggerSaveUpdate();
  };

  const addProduct = async (p: Omit<Product, 'id'>) => {
    const localId = 'prod_' + Math.random().toString(36).substr(2, 9);
    const newProduct = { ...p, id: localId };
    const updated = [...products, newProduct];
    setProducts(updated);
    saveLocal(STORAGE_KEYS.PRODUCTS, updated);
    triggerSaveUpdate();
  };

  const start414Program = async (p: Omit<Program414, 'id' | 'referralIds' | 'status'>) => {
    const localId = 'prog_' + Math.random().toString(36).substr(2, 9);
    const newProgram: Program414 = { 
      ...p, 
      id: localId, 
      referralIds: [], 
      status: 'active' 
    };
    const updated = [...programs414, newProgram];
    setPrograms414(updated);
    saveLocal(STORAGE_KEYS.PROGRAMS_414, updated);
    triggerSaveUpdate();
  };

  const addInventoryItem = async (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    const localId = 'inv_' + Math.random().toString(36).substr(2, 9);
    const newItem: InventoryItem = { 
      ...item, 
      id: localId, 
      lastUpdated: new Date().toISOString() 
    };
    const updated = [...inventory, newItem];
    setInventory(updated);
    saveLocal(STORAGE_KEYS.INVENTORY, updated);
    triggerSaveUpdate();
  };

  const updateInventory = async (item: InventoryItem) => {
    const updated = inventory.map(x => x.id === item.id ? item : x);
    setInventory(updated);
    saveLocal(STORAGE_KEYS.INVENTORY, updated);
    triggerSaveUpdate();
    if (!isTemp(item.id) && isSupabaseReady && supabase) {
      supabase.from('inventory').update(mapInventoryToDB(item)).eq('id', item.id).then();
    }
  };

  const addAppointment = async (a: Omit<Appointment, 'id'>) => {
    const localId = 'appt_' + Math.random().toString(36).substr(2, 9);
    const newAppt: Appointment = { ...a, id: localId };
    const updated = [...appointments, newAppt];
    setAppointments(updated);
    saveLocal('sky_appointments', updated);
    triggerSaveUpdate();
  };

  const updateAppointment = async (a: Appointment) => {
    const updated = appointments.map(x => x.id === a.id ? a : x);
    setAppointments(updated);
    saveLocal('sky_appointments', updated);
    triggerSaveUpdate();
    if (!isTemp(a.id) && isSupabaseReady && supabase) {
      supabase.from('appointments').update(mapAppointmentToDB(a)).eq('id', a.id).then();
    }
  };

  return (
    <AppContext.Provider value={{ 
      userProfile, customers, leads, products, orders, team, programs414, inventory, pipelineOrder, 
      millionPipelineOrder, skyPipelineOrder, dignPipelineOrder,
      loading, machineFees, appointments,
      isCloudActive: isSupabaseReady && !!session,
      saving, lastSaved, lastSyncError, pendingCount,
      googleMapsApiKey,
      session,
      googleTokens,
      registerBiometrics,
      loginBiometrics, setGoogleMapsApiKey, setGoogleTokens, syncToGoogleCalendar, syncPendingData,
      addCustomer, removeCustomer, removeLead, removeOrder, removeAppointment, removeTeamMember, removeProduct, removeInventoryItem,
      addLead, importMillionLeads, importDignLeads, importSkyLeads, importLeadsFromRawText, fixPipelineLeads, moveLeadsBetweenPipelines, clearPipelineLeads, updateLeadStage, updateLead, updatePipelineOrder, renamePipelineStage, addTeamMember, 
      addProduct, createOrder, updateOrder,
      updateMachineFees, resetApp, importBackup, updateUserProfile, start414Program, 
      addReferralToProgram, addInventoryItem, 
      updateInventory,
      addAppointment, 
      updateAppointment, 
      toggleAppointmentStatus, fetchInitialData, saveProgress,
      testCloudConnection, activeTab, setActiveTab,
      selectedCustomerId, setSelectedCustomerId,
      deletedItems
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp deve ser usado dentro de AppProvider');
  return context;
};
