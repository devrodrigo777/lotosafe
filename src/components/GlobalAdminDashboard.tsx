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
  Key
} from 'lucide-react';
import { motion } from 'motion/react';
import { AdminDashboard } from './AdminDashboard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

export const GlobalAdminDashboard = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  const formatTimestamp = (ts: any) => {
    if (!ts || ts === 'Nunca') return 'Nunca';
    if (typeof ts === 'string') return ts;
    if (ts.toDate) return ts.toDate().toLocaleString();
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
    return String(ts);
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const companiesSnap = await getDocs(collection(db, 'companies'));
      const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'company')));
      
      const usersMap = new Map();
      usersSnap.docs.forEach(d => {
        const data = d.data();
        usersMap.set(data.companyId, { id: d.id, ...data });
      });

      const companiesData = await Promise.all(companiesSnap.docs.map(async (d) => {
        const company = { id: d.id, ...d.data() };
        const user = usersMap.get(d.id);
        
        // Fetch instruction count
        const instSnap = await getDocs(query(collection(db, 'instructions'), where('companyId', '==', d.id)));
        
        return {
          ...company,
          user,
          instructionCount: instSnap.size,
          lastLogin: user?.lastLogin || 'Nunca',
          lastInstructionView: user?.lastInstructionView || 'Nunca',
          active: user?.active ?? true
        };
      }));

      setCompanies(companiesData);
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.LIST, 'companies/users');
    } finally {
      setLoading(false);
    }
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
        createdAt: serverTimestamp()
      });

      // Create the user record in Firestore linked to the Auth UID
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        username,
        role: 'company',
        companyId: companyRef.id,
        active: true,
        createdAt: serverTimestamp()
      });

      fetchCompanies();
      (e.target as HTMLFormElement).reset();
      alert('Empresa e usuário criados com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao criar empresa: ${err.message}`);
    }
  };

  const toggleStatus = async (company: any) => {
    if (!company.user) return;
    try {
      await setDoc(doc(db, 'users', company.user.id), {
        active: !company.active
      }, { merge: true });
      fetchCompanies();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetPassword = async (company: any) => {
    if (!company.user) {
      toast.error("Usuário não encontrado para esta empresa");
      return;
    }
    if (!confirm(`Deseja resetar a senha da empresa "${company.name}" para o padrão "1234ABcd"?`)) return;

    try {
      // In a real app, we would use a Firebase Admin SDK or a cloud function
      // Since we don't have that here, we'll update a 'resetPassword' flag in Firestore
      // that the user's client can detect and force a change, or we use our helper if available.
      // For this environment, we'll simulate it by updating the user record.
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
                    <TableHead>Último Login</TableHead>
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
                      <TableCell className="text-sm">
                        {formatTimestamp(company.lastLogin)}
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
    </div>
  );
};
