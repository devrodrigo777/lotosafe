import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, query, where, orderBy, addDoc, serverTimestamp, updateDoc, doc, increment, setDoc, deleteDoc } from '@/firebase';
import { Instruction, Company, Comment } from '@/types';
import { useLocation } from '@/contexts/LocationContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, ThumbsUp, MessageSquare, Download, QrCode, ChevronRight, FileText, Clock, MapPin, Building2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

import { useNavigate } from 'react-router-dom';

export const InstructionList = () => {
  const navigate = useNavigate();
  const { currentCompanies, location } = useLocation();
  const { user } = useAuth();
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);

  useEffect(() => {
    if (currentCompanies.length > 0) {
      fetchInstructions();
      logAccess();
    } else {
      setInstructions([]);
      setLoading(false);
    }
  }, [currentCompanies]);

  const logAccess = async () => {
    if (currentCompanies.length === 0) return;
    
    for (const company of currentCompanies) {
      const sessionKey = `loto_access_${company.id}_main`;
      if (sessionStorage.getItem(sessionKey)) continue;

      try {
        await addDoc(collection(db, 'global_accesses'), {
          companyId: company.id,
          instructionId: 'main',
          userId: user?.uid || 'anonymous',
          createdAt: serverTimestamp()
        });
        sessionStorage.setItem(sessionKey, 'true');
      } catch (err) {
        console.error('Error logging access:', err);
      }
    }
  };

  const fetchInstructions = async () => {
    setLoading(true);
    try {
      const companyIds = currentCompanies.map(c => c.id);
      // Firestore 'in' query supports up to 10 items. 
      // If there are more than 10 companies (unlikely for a single location), we'd need multiple queries.
      const q = query(collection(db, 'instructions'), where('companyId', 'in', companyIds));
      const snap = await getDocs(q);
      setInstructions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Instruction)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = instructions.filter(i => 
    (i.equipmentName.toLowerCase().includes(search.toLowerCase()) || 
     i.category.toLowerCase().includes(search.toLowerCase())) &&
    (category === 'all' || i.category === category)
  );

  const categories = ['all', ...new Set(instructions.map(i => i.category))];

  if (currentCompanies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="bg-muted p-6 rounded-full mb-6">
          <Building2 className="w-12 h-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Nenhuma empresa detectada</h2>
        <p className="text-muted-foreground max-w-md mb-8">
          Você não está dentro do raio de acesso de nenhuma empresa cadastrada no sistema LOTO Safe.
        </p>

        {location && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left max-w-md w-full space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <MapPin className="w-3 h-3" />
              Suas coordenadas atuais:
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm font-mono">
              <div>
                <p className="text-[10px] text-slate-400">Latitude</p>
                <p>{location.lat.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400">Longitude</p>
                <p>{location.lng.toFixed(6)}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-4 italic">
              Dica: Verifique se as coordenadas cadastradas no Painel Admin coincidem com sua posição atual.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div 
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => setShowLocationModal(true)}
          >
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold truncate max-w-[150px]">
              {currentCompanies.length === 1 ? currentCompanies[0].name : `${currentCompanies.length} Unidades`}
            </span>
            <MapPin className="w-3 h-3 text-muted-foreground" />
          </div>
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar equipamento..." 
              className="pl-10 rounded-full h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          {categories.map(cat => (
            <Button 
              key={cat} 
              variant={category === cat ? 'default' : 'outline'}
              size="sm"
              className="rounded-full capitalize whitespace-nowrap"
              onClick={() => setCategory(cat)}
            >
              {cat === 'all' ? 'Todos' : cat}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((instruction, idx) => (
            <motion.div
              key={instruction.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow border-l-4 border-l-primary">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row items-center">
                    <div className="p-6 flex-1 w-full">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Badge variant="secondary" className="mb-2">{instruction.category}</Badge>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold">{instruction.equipmentName}</h3>
                            {instruction.version && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1">v{instruction.version}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <ThumbsUp className={`w-4 h-4 ${instruction.likes > 0 ? 'fill-primary text-primary' : ''}`} />
                            <span className="text-xs font-bold">{instruction.likes}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>Atualizado em: {new Date(instruction.updatedAt?.seconds * 1000).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          <span>{instruction.steps.length} passos de segurança</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted/50 p-4 sm:p-6 flex sm:flex-col gap-2 w-full sm:w-auto border-t sm:border-t-0 sm:border-l">
                      <Button 
                        className="w-full gap-2 rounded-full" 
                        onClick={() => navigate(`/instruction/${instruction.id}`)}
                      >
                        Ver Instrução
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Location Modal */}
      <Dialog open={showLocationModal} onOpenChange={setShowLocationModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sua Localização Atual</DialogTitle>
            <DialogDescription>
              Você está dentro do perímetro de segurança desta unidade.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {currentCompanies.map(company => (
              <div key={company.id} className="flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-primary">Unidade Detectada</p>
                  <p className="text-lg font-black text-slate-900">{company.name}</p>
                  <p className="text-[10px] text-muted-foreground">Raio: {company.location.radius}m</p>
                </div>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Latitude</p>
                <p className="font-mono font-bold text-slate-700">{location?.lat.toFixed(6)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Longitude</p>
                <p className="font-mono font-bold text-slate-700">{location?.lng.toFixed(6)}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-amber-900">Perímetro Ativo</p>
                <p className="text-xs text-amber-800/70">
                  O acesso às instruções é permitido apenas dentro do perímetro de segurança das unidades detectadas.
                </p>
              </div>
            </div>
          </div>
          <Button className="w-full rounded-full" onClick={() => setShowLocationModal(false)}>
            Entendido
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

