import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, query, where, addDoc, serverTimestamp, doc, getDoc, onSnapshot, orderBy, limit, deleteDoc, updateDoc, handleFirestoreError, OperationType } from '@/firebase';
import { Company, Instruction, Comment } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, LayoutDashboard, FileText, Settings, Users, MapPin, PlusCircle, Trash2, MessageSquare, ThumbsUp, Clock, Edit, Save, Key, Map, Target, Loader2, QrCode } from 'lucide-react';
import { InstructionEditor } from './InstructionEditor';
import { toast } from 'sonner';
import { updatePassword } from '@/firebase';

import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export const AdminDashboard = ({ companyId }: { companyId: string }) => {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState<Instruction | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [recentComments, setRecentComments] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalAcessos: 0,
    instrucoesAtivas: 0,
    totalLikes: 0
  });

  // QR Code Modal state
  const [savedInstructionId, setSavedInstructionId] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrModalTitle, setQrModalTitle] = useState('Instrução Salva!');

  // Settings state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPass, setUpdatingPass] = useState(false);
  const [locationSettings, setLocationSettings] = useState({
    lat: 0,
    lng: 0,
    radius: 0
  });
  const [updatingLocation, setUpdatingLocation] = useState(false);

  useEffect(() => {
    if (companyId) {
      fetchCompanyData();
      
      // Real-time instructions
      const qInst = query(collection(db, 'instructions'), where('companyId', '==', companyId));
      const unsubInst = onSnapshot(qInst, (snap) => {
        const instData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Instruction));
        setInstructions(instData);
        
        const likes = instData.reduce((acc, curr) => acc + (curr.likes || 0), 0);
        setSummary(prev => ({ ...prev, instrucoesAtivas: instData.length, totalLikes: likes }));
      }, (err) => {
        console.error("Instructions snapshot error:", err);
        handleFirestoreError(err, OperationType.LIST, 'instructions');
      });

      // Real-time access stats
      const qAccess = query(
        collection(db, 'global_accesses'),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );
      const unsubAccess = onSnapshot(qAccess, (snap) => {
        const accessDocs = snap.docs.map(d => d.data());
        setSummary(prev => ({ ...prev, totalAcessos: accessDocs.length }));

        // Group by day for the chart
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const chartData = days.map(day => ({ name: day, acessos: 0 }));
        
        accessDocs.forEach(acc => {
          if (acc.createdAt) {
            const date = acc.createdAt.toDate ? acc.createdAt.toDate() : new Date(acc.createdAt.seconds * 1000);
            const dayName = days[date.getDay()];
            const dayObj = chartData.find(d => d.name === dayName);
            if (dayObj) dayObj.acessos++;
          }
        });

        // Reorder chartData to start from current day - 6
        const today = new Date().getDay();
        const orderedData = [];
        for (let i = 0; i < 7; i++) {
          const idx = (today - 6 + i + 7) % 7;
          orderedData.push(chartData[idx]);
        }
        setStats(orderedData);
      }, (err) => {
        console.error("Access stats snapshot error:", err);
        handleFirestoreError(err, OperationType.LIST, 'global_accesses');
      });

      // Real-time recent comments
      const qComments = query(
        collection(db, 'global_comments'), 
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      
      const unsubComments = onSnapshot(qComments, (snap) => {
        setRecentComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => {
        console.error("Comments snapshot error:", err);
        handleFirestoreError(err, OperationType.LIST, 'global_comments');
      });

      return () => {
        unsubInst();
        unsubAccess();
        unsubComments();
      };
    }
  }, [companyId]);

  const fetchCompanyData = async () => {
    try {
      const docRef = doc(db, 'companies', companyId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.id ? { id: snap.id, ...snap.data() } as Company : null;
        if (data) {
          setCompany(data);
          setLocationSettings({
            lat: data.location.lat,
            lng: data.location.lng,
            radius: data.location.radius
          });
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados da empresa");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (!user) return;

    setUpdatingPass(true);
    try {
      await updatePassword(user, newPassword);
      toast.success("Senha atualizada com sucesso!");
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      toast.error(`Erro ao atualizar senha: ${err.message}`);
    } finally {
      setUpdatingPass(false);
    }
  };

  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Updating location for company:", companyId, locationSettings);
    setUpdatingLocation(true);
    try {
      await updateDoc(doc(db, 'companies', companyId), {
        location: {
          lat: Number(locationSettings.lat),
          lng: Number(locationSettings.lng),
          radius: Number(locationSettings.radius)
        }
      });
      toast.success("Localização atualizada com sucesso!");
      fetchCompanyData();
    } catch (err) {
      console.error("Error updating location:", err);
      toast.error("Erro ao atualizar localização");
    } finally {
      setUpdatingLocation(false);
    }
  };

  const captureCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada");
      return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
      const newLat = pos.coords.latitude;
      const newLng = pos.coords.longitude;
      console.log("Captured location:", newLat, newLng);
      setLocationSettings(prev => ({
        ...prev,
        lat: newLat,
        lng: newLng
      }));
      toast.success("Coordenadas capturadas!");
    }, (err) => {
      console.error("Geolocation error:", err);
      toast.error(`Erro ao capturar localização: ${err.message}`);
    }, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    });
  };

  const handleDeleteInstruction = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta instrução?')) return;
    try {
      await deleteDoc(doc(db, 'instructions', id));
      toast.success("Instrução excluída com sucesso");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir instrução");
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground font-medium">Carregando painel...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard Administrativo</h2>
          <p className="text-muted-foreground">Gerencie as instruções de segurança LOTO da {company?.name}.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => {
            setEditingInstruction(null);
            setShowEditor(!showEditor);
          }} className="gap-2">
            {showEditor ? <LayoutDashboard className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
            {showEditor ? 'Ver Dashboard' : 'Nova Instrução'}
          </Button>
        </div>
      </div>

      {showEditor ? (
        <InstructionEditor 
          companyId={companyId} 
          onSave={(id) => {
            setShowEditor(false);
            setEditingInstruction(null);
            setSavedInstructionId(id);
            setQrModalTitle('Instrução Salva!');
            setShowQRModal(true);
          }} 
          initialData={editingInstruction || undefined}
        />
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="instructions">Instruções</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Acessos</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.totalAcessos.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">+20.1% em relação ao mês passado</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Instruções Ativas</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.instrucoesAtivas}</div>
                  <p className="text-xs text-muted-foreground">Atualizado em tempo real</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Engajamento (Likes)</CardTitle>
                  <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.totalLikes}</div>
                  <p className="text-xs text-muted-foreground">Feedback positivo acumulado</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Localização</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Ativa</div>
                  <p className="text-xs text-muted-foreground">Raio de {company?.location.radius}m configurado</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Métricas de Acesso</CardTitle>
                  <CardDescription>Visualização semanal de interações.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#888', fontSize: 12 }}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#888', fontSize: 12 }}
                        />
                        <Tooltip 
                          cursor={{ fill: '#f8f8f8' }}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Bar 
                          dataKey="acessos" 
                          fill="hsl(var(--primary))" 
                          radius={[4, 4, 0, 0]} 
                          barSize={32}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Feedback Recente</CardTitle>
                  <CardDescription>Últimos comentários dos operadores.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {recentComments.length > 0 ? recentComments.map((comment) => (
                      <div key={comment.id} className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                          {comment.userName?.substring(0, 2).toUpperCase() || 'OP'}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold leading-none">{comment.userName}</p>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {comment.createdAt?.seconds ? new Date(comment.createdAt.seconds * 1000).toLocaleDateString() : 'Agora'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 italic">
                            "{comment.content}"
                          </p>
                        </div>
                      </div>
                    )) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                        <MessageSquare className="w-8 h-8 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">Nenhum feedback recebido ainda.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="instructions">
             <Card>
               <CardHeader className="flex flex-row items-center justify-between">
                 <div>
                   <CardTitle>Gerenciar Instruções</CardTitle>
                   <CardDescription>Visualize e edite as instruções cadastradas para {company?.name}.</CardDescription>
                 </div>
                 <Badge variant="outline">{instructions.length} Total</Badge>
               </CardHeader>
               <CardContent>
                 <div className="space-y-4">
                   {instructions.length > 0 ? instructions.map((inst) => (
                     <div key={inst.id} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/5 transition-colors group">
                       <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                           <FileText className="w-6 h-6" />
                         </div>
                         <div>
                           <div className="flex items-center gap-2">
                            <h4 className="font-bold">{inst.equipmentName}</h4>
                            {inst.version && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1">v{inst.version}</Badge>
                            )}
                          </div>
                           <div className="flex items-center gap-3 text-xs text-muted-foreground">
                             <span className="bg-muted px-2 py-0.5 rounded-full">{inst.category}</span>
                             <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {inst.likes || 0}</span>
                             <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {inst.steps.length} passos</span>
                           </div>
                         </div>
                       </div>
                       <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className="text-primary hover:bg-primary/10" 
                           onClick={() => {
                             setSavedInstructionId(inst.id);
                             setQrModalTitle('QR Code de Acesso');
                             setShowQRModal(true);
                           }}
                           title="Ver QR Code"
                         >
                           <QrCode className="w-4 h-4" />
                         </Button>
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className="text-primary hover:bg-primary/10" 
                           onClick={() => {
                             setEditingInstruction(inst);
                             setShowEditor(true);
                           }}
                           title="Editar"
                         >
                           <Edit className="w-4 h-4" />
                         </Button>
                         <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteInstruction(inst.id)} title="Excluir">
                           <Trash2 className="w-4 h-4" />
                         </Button>
                       </div>
                     </div>
                   )) : (
                     <div className="text-center py-20 border-2 border-dashed rounded-2xl space-y-4">
                       <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                         <Plus className="w-8 h-8 text-muted-foreground" />
                       </div>
                       <div className="space-y-1">
                         <p className="font-medium">Nenhuma instrução criada</p>
                         <p className="text-sm text-muted-foreground">Comece criando sua primeira instrução de segurança.</p>
                       </div>
                       <Button onClick={() => setShowEditor(true)} variant="outline" size="sm">
                         Criar Agora
                       </Button>
                     </div>
                   )}
                 </div>
               </CardContent>
             </Card>
          </TabsContent>
          <TabsContent value="settings" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Map className="w-5 h-5 text-primary" />
                    Localização da Unidade
                  </CardTitle>
                  <CardDescription>Configure as coordenadas e o raio de acesso para esta unidade.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateLocation} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="lat">Latitude</Label>
                        <Input 
                          id="lat" 
                          type="number" 
                          step="any"
                          value={locationSettings.lat} 
                          onChange={(e) => setLocationSettings(prev => ({ ...prev, lat: parseFloat(e.target.value) }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lng">Longitude</Label>
                        <Input 
                          id="lng" 
                          type="number" 
                          step="any"
                          value={locationSettings.lng} 
                          onChange={(e) => setLocationSettings(prev => ({ ...prev, lng: parseFloat(e.target.value) }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="radius">Raio de Acesso (metros)</Label>
                      <div className="flex gap-2">
                        <Input 
                          id="radius" 
                          type="number" 
                          value={locationSettings.radius} 
                          onChange={(e) => setLocationSettings(prev => ({ ...prev, radius: parseInt(e.target.value) }))}
                        />
                        <Button type="button" variant="outline" onClick={captureCurrentLocation} className="gap-2 whitespace-nowrap">
                          <Target className="w-4 h-4" />
                          Capturar Atual
                        </Button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full gap-2" disabled={updatingLocation}>
                      {updatingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Salvar Localização
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-primary" />
                    Alterar Senha
                  </CardTitle>
                  <CardDescription>Atualize sua senha de acesso ao painel administrativo.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">Nova Senha</Label>
                      <Input 
                        id="new-password" 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                      <Input 
                        id="confirm-password" 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full gap-2" disabled={updatingPass}>
                      {updatingPass ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Atualizar Senha
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* QR Code Modal for Saved Instruction */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle>{qrModalTitle}</DialogTitle>
            <DialogDescription>
              Deseja obter o QR Code para acesso rápido a esta instrução?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <div className="p-4 bg-white rounded-2xl shadow-inner border" id="qr-modal-container">
              <QRCodeSVG 
                value={`${window.location.origin}/instruction/${savedInstructionId}`} 
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="text-xs font-mono text-muted-foreground break-all bg-slate-50 p-2 rounded border w-full">
              {`${window.location.origin}/instruction/${savedInstructionId}`}
            </p>
          </div>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setShowQRModal(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              const svg = document.querySelector('#qr-modal-container svg') as SVGGraphicsElement;
              const currentInst = instructions.find(i => i.id === savedInstructionId);
              if (svg && company && currentInst) {
                const svgData = new XMLSerializer().serializeToString(svg);
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                img.onload = () => {
                  const qrSize = 1000; // Even larger for high quality
                  const padding = 80;
                  const headerHeight = 150;
                  const footerHeight = 350; // More space for huge company name
                  
                  canvas.width = qrSize + padding * 2;
                  canvas.height = qrSize + padding * 2 + headerHeight + footerHeight;
                  
                  if (ctx) {
                    // Background
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // Header - Equipment Name
                    ctx.fillStyle = '#0f172a';
                    ctx.font = 'bold 60px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(currentInst.equipmentName.toUpperCase(), canvas.width / 2, padding + 50);
                    
                    ctx.font = '30px Inter, sans-serif';
                    ctx.fillStyle = '#64748b';
                    ctx.fillText('INSTRUÇÕES DE BLOQUEIO DE EQUIPAMENTO', canvas.width / 2, padding + 110);
                    
                    // Draw QR Code
                    ctx.drawImage(img, padding, padding + headerHeight, qrSize, qrSize);
                    
                    // Footer - Company Name
                    ctx.fillStyle = '#111111';
                    ctx.font = 'black 350px Inter, sans-serif'; // Even larger as requested
                    ctx.fillText(company.name.toUpperCase(), canvas.width / 2, padding + headerHeight + qrSize + 280);
                    
                    const pngFile = canvas.toDataURL('image/png');
                    const downloadLink = document.createElement('a');
                    downloadLink.download = `QR-LOTO-${currentInst.equipmentName}.png`;
                    downloadLink.href = pngFile;
                    downloadLink.click();
                  }
                };
                img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
              }
              setShowQRModal(false);
            }}>
              Baixar QR Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
