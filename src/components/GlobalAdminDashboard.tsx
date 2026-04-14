import React, { useState, useEffect } from 'react';
import { 
  db, 
  collection, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  setDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
  createSecondaryUser,
  handleFirestoreError,
  OperationType
} from '@/firebase';
import { Company } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  PlusCircle, 
  Users, 
  Building2, 
  ShieldCheck, 
  Power, 
  RefreshCw,
  Search,
  MapPin,
  Eye,
  Key,
  Clock,
  Trash2,
  Edit
} from 'lucide-react';
import { motion } from 'motion/react';
import { AdminDashboard } from './AdminDashboard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ConfirmationModal } from './ConfirmationModal';

export const GlobalAdminDashboard = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive';
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const formatTimestamp = (ts: any) => {
    if (!ts || ts === 'Nunca') return 'Nunca';
    if (typeof ts === 'string') return ts;
    if (ts.toDate) return ts.toDate().toLocaleString();
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
    return String(ts);
  };

  useEffect(() => {
    const qCompanies = collection(db, 'companies');
    const qUsers = query(collection(db, 'users'), where('role', '==', 'company'));
    const qInstructions = collection(db, 'instructions');

    let companiesData: any[] = [];
    let usersMap = new Map();
    let instructionsCountMap = new Map();

    const updateState = () => {
      const merged = companiesData.map(c => {
        const user = usersMap.get(c.id);
        return {
          ...c,
          user,
          instructionCount: instructionsCountMap.get(c.id) || 0,
          lastLogin: user?.lastLogin || 'Nunca',
          lastInstructionView: user?.lastInstructionView || 'Nunca',
          active: user?.active ?? true
        };
      });
      setCompanies(merged);
      setLoading(false);
    };

    const unsubCompanies = onSnapshot(qCompanies, (snap) => {
      companiesData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      updateState();
    });

    const unsubUsers = onSnapshot(qUsers, (snap) => {
      usersMap = new Map();
      snap.docs.forEach(d => {
        const data = d.data();
        usersMap.set(data.companyId, { id: d.id, ...data });
      });
      updateState();
    });

    const unsubInstructions = onSnapshot(qInstructions, (snap) => {
      instructionsCountMap = new Map();
      snap.docs.forEach(d => {
        const companyId = d.data().companyId;
        instructionsCountMap.set(companyId, (instructionsCountMap.get(companyId) || 0) + 1);
      });
      updateState();
    });

    return () => {
      unsubCompanies();
      unsubUsers();
      unsubInstructions();
    };
  }, []);

  const fetchCompanies = () => {
    // No longer needed as we use onSnapshot
  };

  const handleCreateCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const lat = parseFloat(formData.get('lat') as string);
    const lng = parseFloat(formData.get('lng') as string);
    const radius = parseFloat(formData.get('radius') as string);

    try {
      // Create the real Firebase Auth user using the secondary app helper
      const email = username.includes('@') ? username : `${username}@loto.safe`;
      const userCredential = await createSecondaryUser(email, password);
      
      const companyRef = await addDoc(collection(db, 'companies'), {
        name,
        location: { lat, lng, radius },
        createdAt: serverTimestamp(),
        trialExpiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        canResetTrial: false,
        status: 'active'
      });

      // Create the user record in Firestore linked to the Auth UID
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        username,
        role: 'company',
        companyId: companyRef.id,
        active: true,
        createdAt: serverTimestamp()
      });

      (e.target as HTMLFormElement).reset();
      toast.success('Empresa e usuário criados com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error(`Erro ao criar empresa: ${err.message}`);
    }
  };

  const toggleStatus = async (company: any) => {
    if (!company.user) return;
    try {
      await setDoc(doc(db, 'users', company.user.id), {
        active: !company.active
      }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetPassword = async (company: any) => {
    if (!company.user) {
      toast.error("Usuário não encontrado para esta empresa");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Resetar Senha",
      description: `Deseja resetar a senha da empresa "${company.name}" para o padrão "1234ABcd"?`,
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'users', company.user.id), {
            tempPassword: '1234ABcd',
            mustChangePassword: true,
            updatedAt: serverTimestamp()
          });
          toast.success("Senha resetada com sucesso para: 1234ABcd");
        } catch (err) {
          console.error(err);
          toast.error("Erro ao resetar senha");
        }
      }
    });
  };

  const handleUpdateLicense = async (companyId: string, type: 'trial' | 'trial_5m' | 'monthly' | 'lifetime') => {
    try {
      let trialExpiresAt = null;
      if (type === 'trial') {
        trialExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      } else if (type === 'trial_5m') {
        trialExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
      } else if (type === 'monthly') {
        trialExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      await updateDoc(doc(db, 'companies', companyId), {
        licenseType: type === 'trial_5m' ? 'trial' : type,
        trialExpiresAt: trialExpiresAt,
        status: 'active',
        updatedAt: serverTimestamp()
      });
      toast.success(`Licença atualizada para ${type === 'lifetime' ? 'Vitalícia' : type === 'monthly' ? 'Mensal' : type === 'trial_5m' ? 'Trial (5 min)' : 'Trial'}`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar licença");
    }
  };

  const handleResetTrial = async (company: any) => {
    setConfirmModal({
      isOpen: true,
      title: "Resetar Período de Demonstração",
      description: `Deseja resetar o período de trial da empresa "${company.name}" para 3 dias?`,
      onConfirm: async () => {
        try {
          console.log("Resetting trial for company:", company.id);
          const newExpiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
          
          const companyRef = doc(db, 'companies', company.id);
          await updateDoc(companyRef, {
            trialExpiresAt: newExpiry,
            status: 'active',
            licenseType: 'trial',
            isTrialExtended: true,
            updatedAt: serverTimestamp()
          });
          
          toast.success(`Período de demonstração redefinido com sucesso! Nova expiração: ${newExpiry.toLocaleString()}`);
        } catch (err) {
          console.error("Error resetting trial:", err);
          toast.error("Erro ao resetar trial");
        }
      }
    });
  };

  const toggleTrialReset = async (company: any) => {
    try {
      await updateDoc(doc(db, 'companies', company.id), {
        canResetTrial: !company.canResetTrial
      });
      toast.success(`Permissão de reset ${!company.canResetTrial ? 'concedida' : 'removida'}`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar permissão de reset");
    }
  };

  const handleDeleteCompany = async (company: any) => {
    setConfirmModal({
      isOpen: true,
      title: "Deletar Empresa",
      description: `Tem certeza que deseja deletar a empresa "${company.name}"? Esta ação é irreversível e apagará todos os dados associados (usuário e instruções).`,
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          
          // Delete company doc
          batch.delete(doc(db, 'companies', company.id));
          
          // Delete associated user doc if exists
          if (company.user?.id) {
            batch.delete(doc(db, 'users', company.user.id));
          }
          
          // Delete associated instructions
          const qInst = query(collection(db, 'instructions'), where('companyId', '==', company.id));
          const instSnap = await getDocs(qInst);
          instSnap.forEach(d => batch.delete(d.ref));
          
          await batch.commit();
          toast.success("Empresa deletada com sucesso!");
        } catch (err) {
          console.error(err);
          toast.error("Erro ao deletar empresa");
        }
      }
    });
  };

  const handleEditCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCompany) return;
    
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const username = formData.get('username') as string;
    
    try {
      const batch = writeBatch(db);
      
      // Update company name
      batch.update(doc(db, 'companies', editingCompany.id), { 
        name,
        updatedAt: serverTimestamp()
      });
      
      // Update user username if exists
      if (editingCompany.user?.id) {
        batch.update(doc(db, 'users', editingCompany.user.id), { 
          username,
          updatedAt: serverTimestamp()
        });
      }
      
      await batch.commit();
      setShowEditModal(false);
      setEditingCompany(null);
      toast.success("Empresa atualizada com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar empresa");
    }
  };

  const filtered = companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Painel Global Admin</h2>
          <p className="text-muted-foreground">Gerenciamento de empresas e acessos do sistema.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar empresa..." 
              className="pl-10 w-64 rounded-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={fetchCompanies} variant="outline" size="icon" className="rounded-full">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Cadastrar Nova Empresa</CardTitle>
            <CardDescription>Crie um novo cliente e defina suas credenciais.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Empresa</Label>
                <Input name="name" required placeholder="Ex: Petrobras Unidade X" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Usuário (Login)</Label>
                  <Input name="username" required placeholder="empresa_x" />
                </div>
                <div className="space-y-2">
                  <Label>Senha Inicial</Label>
                  <Input name="password" type="password" required placeholder="••••••••" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Latitude</Label>
                  <Input name="lat" type="number" step="any" required placeholder="-23.5" />
                </div>
                <div className="space-y-2">
                  <Label>Longitude</Label>
                  <Input name="lng" type="number" step="any" required placeholder="-46.6" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Raio de Acesso (m)</Label>
                <Input name="radius" type="number" defaultValue="500" required />
              </div>
              <Button type="submit" className="w-full gap-2">
                <PlusCircle className="w-4 h-4" />
                Criar Empresa
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lista de Empresas</CardTitle>
            <CardDescription>Monitoramento e controle de acessos.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead className="text-center">Instruções</TableHead>
                    <TableHead>Licença</TableHead>
                    <TableHead>Trial Expira em</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <div className="font-medium">{company.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {company.location.lat.toFixed(4)}, {company.location.lng.toFixed(4)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{company.user?.username || '---'}</code>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{company.instructionCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <select 
                          className="text-xs bg-white border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                          value={company.licenseType || 'trial'}
                          onChange={(e) => handleUpdateLicense(company.id, e.target.value as any)}
                        >
                          <option value="trial">Trial (3 dias)</option>
                          <option value="trial_5m">Trial (5 min)</option>
                          <option value="monthly">1 Mês</option>
                          <option value="lifetime">Vitalícia</option>
                        </select>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col gap-1">
                          <span>{formatTimestamp(company.trialExpiresAt)}</span>
                          {company.trialExpiresAt && (
                            <span className={`text-[10px] font-bold ${new Date(company.trialExpiresAt.seconds * 1000) < new Date() ? 'text-destructive' : 'text-green-600'}`}>
                              {new Date(company.trialExpiresAt.seconds * 1000) < new Date() ? 'EXPIRADO' : 'EM DIA'}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={company.active ? "default" : "destructive"}>
                          {company.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            title="Resetar Trial (3 dias)"
                            onClick={() => handleResetTrial(company)}
                            className="bg-green-50 border-green-200 text-green-600"
                          >
                            <Clock className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            title={company.canResetTrial ? "Remover Permissão Reset" : "Permitir Reset Trial"}
                            onClick={() => toggleTrialReset(company)}
                            className={company.canResetTrial ? "bg-amber-50 border-amber-200 text-amber-600" : ""}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            title="Editar Empresa"
                            onClick={() => {
                              setEditingCompany(company);
                              setShowEditModal(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            title="Ver Instruções"
                            onClick={() => {
                              setSelectedCompanyId(company.id);
                              setShowInstructionsModal(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            title="Resetar Senha"
                            onClick={() => handleResetPassword(company)}
                          >
                            <Key className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant={company.active ? "destructive" : "default"} 
                            size="icon"
                            onClick={() => toggleStatus(company)}
                            title={company.active ? "Inativar" : "Ativar"}
                          >
                            <Power className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="icon"
                            onClick={() => handleDeleteCompany(company)}
                            title="Deletar Empresa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        Nenhuma empresa encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions Modal for Global Admin */}
      <Dialog open={showInstructionsModal} onOpenChange={setShowInstructionsModal}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Visualizando Instruções da Unidade</DialogTitle>
            <DialogDescription>
              Como Administrador Global, você tem acesso total às instruções e métricas desta unidade.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {selectedCompanyId && <AdminDashboard companyId={selectedCompanyId} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Company Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
            <DialogDescription>
              Atualize o nome e o login de acesso da unidade.
            </DialogDescription>
          </DialogHeader>
          {editingCompany && (
            <form onSubmit={handleEditCompany} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome da Empresa</Label>
                <Input 
                  id="edit-name" 
                  name="name" 
                  defaultValue={editingCompany.name} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-username">Usuário (Login)</Label>
                <Input 
                  id="edit-username" 
                  name="username" 
                  defaultValue={editingCompany.user?.username} 
                  required 
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setShowEditModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar Alterações
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        variant={confirmModal.variant}
      />
    </div>
  );
};
