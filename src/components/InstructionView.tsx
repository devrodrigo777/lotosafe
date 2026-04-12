import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, doc, getDoc, collection, addDoc, serverTimestamp, updateDoc, increment, setDoc, query, orderBy, getDocs } from '@/firebase';
import { Instruction, Company, Comment } from '@/types';
import { useLocation } from '@/contexts/LocationContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  ShieldAlert, 
  Clock, 
  FileText, 
  ThumbsUp, 
  MessageSquare, 
  Download, 
  QrCode, 
  ChevronLeft,
  MapPin,
  Building2,
  AlertCircle,
  Loader2,
  User,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculateDistance } from '@/lib/utils';

export const InstructionView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { location } = useLocation();
  const { user } = useAuth();
  
  const [instruction, setInstruction] = useState<Instruction | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isWithinPerimeter, setIsWithinPerimeter] = useState<boolean | null>(null);
  
  const [visitorInfo, setVisitorInfo] = useState<{ name: string; role: string } | null>(null);
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempRole, setTempRole] = useState('');
  
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('loto_visitor_info');
    if (stored) {
      setVisitorInfo(JSON.parse(stored));
    } else {
      setShowVisitorModal(true);
    }
    
    if (id) {
      fetchData();
    }
  }, [id]);

  useEffect(() => {
    if (company && location) {
      const dist = calculateDistance(
        location.lat, 
        location.lng, 
        company.location.lat, 
        company.location.lng
      );
      setIsWithinPerimeter(dist <= company.location.radius);
    }
  }, [company, location]);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const instDoc = await getDoc(doc(db, 'instructions', id));
      if (instDoc.exists()) {
        const instData = { id: instDoc.id, ...instDoc.data() } as Instruction;
        setInstruction(instData);
        
        const compDoc = await getDoc(doc(db, 'companies', instData.companyId));
        if (compDoc.exists()) {
          setCompany({ id: compDoc.id, ...compDoc.data() } as Company);
        }
        
        fetchComments(id);
        
        // Log access if visitor info is available
        const stored = localStorage.getItem('loto_visitor_info');
        if (stored) {
          const info = JSON.parse(stored);
          logAccess(instData.companyId, info);
        }
      } else {
        toast.error("Instrução não encontrada");
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar instrução");
    } finally {
      setLoading(false);
    }
  };

  const logAccess = async (companyId: string, info: { name: string; role: string }) => {
    const sessionKey = `loto_access_${companyId}_${id || 'main'}`;
    if (sessionStorage.getItem(sessionKey)) return;

    try {
      await addDoc(collection(db, 'global_accesses'), {
        companyId,
        instructionId: id || 'main',
        visitorName: info.name,
        visitorRole: info.role,
        userId: user?.uid || 'anonymous',
        createdAt: serverTimestamp()
      });
      sessionStorage.setItem(sessionKey, 'true');
    } catch (err) {
      console.error('Error logging access:', err);
    }
  };

  const fetchComments = async (instId: string) => {
    const q = query(collection(db, 'instructions', instId, 'comments'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
  };

  const handleVisitorSubmit = () => {
    if (!tempName.trim() || !tempRole.trim()) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }
    const info = {
      name: tempName.trim().toUpperCase(),
      role: tempRole.trim().toUpperCase()
    };
    localStorage.setItem('loto_visitor_info', JSON.stringify(info));
    setVisitorInfo(info);
    setShowVisitorModal(false);
    
    if (instruction) {
      logAccess(instruction.companyId, info);
    }
  };

  const handleLike = async () => {
    if (!instruction || !user) return;
    const likeId = `${user.uid}_${instruction.id}`;
    try {
      await setDoc(doc(db, 'likes', likeId), { instructionId: instruction.id, userId: user.uid });
      await updateDoc(doc(db, 'instructions', instruction.id), { likes: increment(1) });
      setInstruction(prev => prev ? { ...prev, likes: (prev.likes || 0) + 1 } : null);
      toast.success("Feedback registrado!");
    } catch (err) {
      // Already liked
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !instruction || !visitorInfo) return;
    try {
      const commentData = {
        instructionId: instruction.id,
        companyId: instruction.companyId,
        userId: user?.uid || 'anonymous',
        userName: visitorInfo.name,
        userRole: visitorInfo.role,
        content: newComment,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'instructions', instruction.id, 'comments'), commentData);
      await addDoc(collection(db, 'global_comments'), commentData);

      setNewComment('');
      fetchComments(instruction.id);
      toast.success('Comentário enviado!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar comentário.');
    }
  };

  const exportPDF = async () => {
    const element = document.getElementById(`instruction-content`);
    if (!element) return;
    
    toast.loading("Gerando PDF...");
    try {
      // Wait for images to load and ensure rendering
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const contentHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = contentHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, contentHeight);
      heightLeft -= pdfHeight;

      // Add subsequent pages if content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - contentHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, contentHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`LOTO-${instruction?.equipmentName || 'instrucao'}.pdf`);
      toast.dismiss();
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      console.error("PDF Export Error:", err);
      toast.dismiss();
      toast.error("Erro ao gerar PDF. Tente novamente.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Carregando instrução de segurança...</p>
      </div>
    );
  }

  if (!instruction || !company) return null;

  if (isWithinPerimeter === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 space-y-6 shadow-2xl border-red-100">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">Acesso Negado</h2>
            <p className="text-muted-foreground">
              Você está fora do perímetro de segurança da unidade <span className="font-bold text-slate-900">{company.name}</span>.
            </p>
          </div>
          
          {location && (
            <div className="bg-slate-100 p-4 rounded-2xl text-left space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <MapPin className="w-3 h-3" />
                Suas coordenadas atuais:
              </p>
              <div className="grid grid-cols-2 gap-4 font-mono text-sm">
                <div>
                  <p className="text-[10px] text-slate-400">LAT</p>
                  <p className="font-bold">{location.lat.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">LNG</p>
                  <p className="font-bold">{location.lng.toFixed(6)}</p>
                </div>
              </div>
            </div>
          )}
          
          <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
            Voltar para o Início
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Sair
          </Button>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <span className="font-black tracking-tighter text-lg">LOTO Safe</span>
          </div>
          <div className="w-20" /> {/* Spacer */}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-3 py-1">
                {instruction.category}
              </Badge>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
                {instruction.equipmentName}
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {company.name}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Atualizado em {new Date(instruction.updatedAt?.seconds * 1000).toLocaleDateString()}
                  {instruction.version && (
                    <Badge variant="secondary" className="ml-2 text-[10px] h-4 px-1">v{instruction.version}</Badge>
                  )}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2 rounded-full" onClick={exportPDF}>
                <Download className="w-4 h-4" />
                PDF Offline
              </Button>
              <Button variant="outline" size="sm" className="gap-2 rounded-full" onClick={() => setShowQRCodeModal(true)}>
                <QrCode className="w-4 h-4" />
                QR Code
              </Button>
            </div>
          </div>

          <div id="instruction-content" className="space-y-8 bg-white p-6 md:p-10 rounded-3xl shadow-xl border border-slate-100">
            <div className="flex items-center justify-between border-b pb-6">
              <div className="space-y-1">
                <h2 className="text-xl font-bold">Instruções de Segurança</h2>
                <p className="text-sm text-muted-foreground">Siga rigorosamente cada passo abaixo para o bloqueio seguro.</p>
              </div>
              <div className="hidden md:block text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">ID da Instrução</p>
                <p className="text-sm font-mono font-bold text-slate-600">{instruction.id.substring(0, 8).toUpperCase()}</p>
              </div>
            </div>

            <div className="space-y-10">
              {instruction.steps.map((step, idx) => (
                <div key={step.id} className="relative">
                  {step.type === 'heading' ? (
                    <div className="pt-4">
                      <h3 className="text-lg font-black uppercase tracking-wider text-primary flex items-center gap-3">
                        <div className="w-8 h-1 bg-primary rounded-full" />
                        {step.label}
                      </h3>
                    </div>
                  ) : (
                    <div className="flex gap-6 items-start">
                      <div className="flex flex-col items-center gap-2 shrink-0">
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-lg">
                          {idx + 1}
                        </div>
                        <div className="w-0.5 h-full bg-slate-100 absolute top-10 -bottom-10 left-5 -z-10" />
                      </div>
                      
                      <div className="flex-1 space-y-4 pb-4">
                        <p className="text-lg font-bold text-slate-800 leading-tight">{step.label}</p>
                        
                        {step.type === 'image' && step.value?.url && (
                          <div className="rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-slate-100">
                            <img 
                              src={step.value.url} 
                              alt={step.label} 
                              className="w-full h-auto max-h-[500px] object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}

                        {(step.type === 'single_choice' || step.type === 'multi_choice') && step.options && (
                          <div className="grid gap-2">
                            {step.options.map((opt, i) => (
                              <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-medium">
                                <div className={`w-5 h-5 rounded-${step.type === 'single_choice' ? 'full' : 'md'} border-2 border-slate-300`} />
                                {opt}
                              </div>
                            ))}
                          </div>
                        )}

                        {step.type === 'checkbox' && (
                          <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-900 text-sm font-bold">
                            <AlertCircle className="w-5 h-5" />
                            Confirmação visual obrigatória neste passo.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-10 border-t flex flex-col items-center gap-6 text-center">
              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Fim da Instrução</p>
                <p className="text-muted-foreground text-sm max-w-sm">
                  Certifique-se de que todos os dispositivos de bloqueio estão devidamente instalados e testados.
                </p>
              </div>
              <Button 
                onClick={handleLike}
                variant="outline" 
                className="rounded-full h-16 px-8 gap-3 border-2 hover:bg-primary/5 hover:border-primary hover:text-primary transition-all group"
              >
                <ThumbsUp className={`w-6 h-6 ${instruction.likes > 0 ? 'fill-primary text-primary' : ''} group-hover:scale-110 transition-transform`} />
                <div className="text-left">
                  <p className="text-xs font-bold uppercase tracking-tighter opacity-60 leading-none">Feedback</p>
                  <p className="text-lg font-black leading-none">{instruction.likes || 0} Útil</p>
                </div>
              </Button>
            </div>
          </div>

          <Card className="rounded-3xl shadow-xl border-slate-100 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Observações do Campo
              </CardTitle>
              <CardDescription>Registre observações ou dificuldades encontradas.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                {comments.length > 0 ? comments.map(comment => (
                  <div key={comment.id} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold shrink-0">
                      {comment.userName?.substring(0, 2)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{comment.userName}</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1">{comment.userRole}</Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(comment.createdAt?.seconds * 1000).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-2xl rounded-tl-none">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-10 text-muted-foreground italic text-sm">
                    Nenhuma observação registrada ainda.
                  </div>
                )}
              </div>

              <div className="pt-4 border-t space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold">{visitorInfo?.name}</p>
                    <p className="text-muted-foreground">{visitorInfo?.role}</p>
                  </div>
                </div>
                <Textarea 
                  placeholder="Descreva sua observação aqui..." 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[100px] rounded-2xl focus-visible:ring-primary"
                />
                <Button className="w-full rounded-full" onClick={handleAddComment}>
                  Enviar Observação
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Visitor Info Modal */}
      <Dialog open={showVisitorModal} onOpenChange={(open) => {
        // Prevent closing if visitor info is not set
        if (!visitorInfo && !open) return;
        setShowVisitorModal(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Identificação Necessária</DialogTitle>
            <DialogDescription>
              Para acessar as instruções de segurança, por favor identifique-se.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="name" 
                  placeholder="EX: JOÃO DA SILVA" 
                  className="pl-10 uppercase"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value.toUpperCase())}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Função / Cargo</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="role" 
                  placeholder="EX: OPERADOR DE MANUTENÇÃO" 
                  className="pl-10 uppercase"
                  value={tempRole}
                  onChange={(e) => setTempRole(e.target.value.toUpperCase())}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={handleVisitorSubmit}>
              Acessar Instruções
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={showQRCodeModal} onOpenChange={setShowQRCodeModal}>
        <DialogContent className="sm:max-w-xs text-center">
          <DialogHeader>
            <DialogTitle>QR Code de Acesso</DialogTitle>
            <DialogDescription>
              Aponte a câmera para acessar esta instrução.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <div className="p-4 bg-white rounded-2xl shadow-inner border">
              <QRCodeSVG 
                value={window.location.href} 
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="text-[10px] font-mono text-muted-foreground break-all">
              {window.location.href}
            </p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => setShowQRCodeModal(false)}>
            Fechar
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};
