import React, { useState } from 'react';
import { db, collection, addDoc, serverTimestamp, updateDoc, doc, handleFirestoreError, OperationType } from '@/firebase';
import { Instruction, InstructionStep, Company } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical, Save, Type, CheckSquare, Image as ImageIcon, List, Heading, Upload, Link as LinkIcon, Loader2 } from 'lucide-react';
import { motion, Reorder } from 'motion/react';
import { useLocation } from '@/contexts/LocationContext';
import { toast } from 'sonner';

export const InstructionEditor = ({ companyId, onSave, initialData }: { companyId: string, onSave: (id: string) => void, initialData?: Instruction }) => {
  const [equipmentName, setEquipmentName] = useState(initialData?.equipmentName || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [steps, setSteps] = useState<InstructionStep[]>(initialData?.steps || []);
  const [saving, setSaving] = useState(false);

  const addStep = (type: InstructionStep['type']) => {
    const newStep: InstructionStep = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      label: '',
      required: true
    };

    if (type === 'single_choice' || type === 'multi_choice') {
      newStep.options = ['Opção 1'];
    }

    if (type === 'image') {
      newStep.value = { mode: 'link', url: '' };
    }

    setSteps([...steps, newStep]);
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id));
  };

  const updateStep = (id: string, updates: Partial<InstructionStep>) => {
    setSteps(steps.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleImageUpload = (id: string, file: File) => {
    // In a real app, we would upload to Firebase Storage
    // For this environment, we'll use a data URL to simulate
    const reader = new FileReader();
    reader.onloadend = () => {
      updateStep(id, { value: { mode: 'upload', url: reader.result as string } });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!equipmentName || steps.length === 0) {
      alert('Por favor, preencha o nome do equipamento e adicione pelo menos um passo.');
      return;
    }
    setSaving(true);
    try {
      // Sanitize steps to remove undefined values which Firestore doesn't support
      const sanitizedSteps = steps.map(step => {
        const s = { ...step };
        Object.keys(s).forEach(key => {
          if ((s as any)[key] === undefined) {
            delete (s as any)[key];
          }
        });
        return s;
      });

      let savedId = initialData?.id || '';

      if (initialData?.id) {
        await updateDoc(doc(db, 'instructions', initialData.id), {
          equipmentName,
          category,
          steps: sanitizedSteps,
          version: (initialData.version || 1) + 1,
          updatedAt: serverTimestamp()
        });
        toast.success('Instrução atualizada com sucesso!');
      } else {
        const docRef = await addDoc(collection(db, 'instructions'), {
          companyId,
          equipmentName,
          category,
          steps: sanitizedSteps,
          likes: 0,
          version: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        savedId = docRef.id;
        toast.success('Instrução criada com sucesso!');
      }
      onSave(savedId);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar instrução. Verifique os campos e tente novamente.');
      handleFirestoreError(err, initialData?.id ? OperationType.UPDATE : OperationType.CREATE, 'instructions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{initialData ? 'Editar Instrução LOTO' : 'Nova Instrução LOTO'}</CardTitle>
              <CardDescription>Crie um guia passo a passo para bloqueio de energias.</CardDescription>
            </div>
            {initialData?.version && (
              <Badge variant="secondary" className="text-lg px-3 py-1">v{initialData.version}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Equipamento</Label>
              <Input value={equipmentName} onChange={(e) => setEquipmentName(e.target.value)} placeholder="Ex: Prensa Hidráulica P-01" />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Elétrica, Mecânica..." />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <List className="w-5 h-5" />
          Passos da Instrução
        </h3>
        
        <div className="space-y-4">
          {steps.map((step, index) => (
            <Card key={step.id} className="relative group overflow-hidden">
              <CardContent className="p-4 flex gap-4">
                <div className="flex flex-col items-center gap-2 pt-2">
                  <div className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeStep(step.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex-1 space-y-4">
                  <div className="flex gap-2">
                    <Input 
                      value={step.label} 
                      onChange={(e) => updateStep(step.id, { label: e.target.value })} 
                      placeholder={step.type === 'heading' ? 'Título da Seção' : 'Descreva o passo de segurança...'}
                      className={step.type === 'heading' ? 'font-bold text-lg' : ''}
                    />
                    <Badge variant="outline" className="capitalize">{step.type}</Badge>
                  </div>

                  {step.type === 'image' && (
                    <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-dashed">
                      <div className="flex items-center gap-4">
                        <Button 
                          variant={step.value?.mode === 'upload' ? 'default' : 'outline'} 
                          size="sm" 
                          className="gap-2"
                          onClick={() => updateStep(step.id, { value: { ...step.value, mode: 'upload' } })}
                        >
                          <Upload className="w-4 h-4" /> Upload
                        </Button>
                        <Button 
                          variant={step.value?.mode === 'link' ? 'default' : 'outline'} 
                          size="sm" 
                          className="gap-2"
                          onClick={() => updateStep(step.id, { value: { ...step.value, mode: 'link' } })}
                        >
                          <LinkIcon className="w-4 h-4" /> Link
                        </Button>
                      </div>

                      {step.value?.mode === 'upload' ? (
                        <div className="space-y-2">
                          <Input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(step.id, file);
                            }}
                          />
                          {step.value.url && (
                            <img src={step.value.url} alt="Preview" className="h-32 rounded-md object-cover border" referrerPolicy="no-referrer" />
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Input 
                            placeholder="https://exemplo.com/imagem.jpg" 
                            value={step.value?.url || ''}
                            onChange={(e) => updateStep(step.id, { value: { ...step.value, url: e.target.value } })}
                          />
                          {step.value?.url && (
                            <img src={step.value.url} alt="Preview" className="h-32 rounded-md object-cover border" referrerPolicy="no-referrer" />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {(step.type === 'single_choice' || step.type === 'multi_choice') && (
                    <div className="space-y-2 pl-4 border-l-2">
                      {step.options?.map((opt, oIdx) => (
                        <div key={oIdx} className="flex gap-2">
                          <Input 
                            value={opt} 
                            onChange={(e) => {
                              const newOpts = [...(step.options || [])];
                              newOpts[oIdx] = e.target.value;
                              updateStep(step.id, { options: newOpts });
                            }}
                            className="h-8 text-sm"
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                            const newOpts = step.options?.filter((_, i) => i !== oIdx);
                            updateStep(step.id, { options: newOpts });
                          }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" className="h-8" onClick={() => updateStep(step.id, { options: [...(step.options || []), `Opção ${(step.options?.length || 0) + 1}`] })}>
                        <Plus className="w-3 h-3 mr-1" /> Adicionar Opção
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 p-4 bg-muted/30 rounded-xl border-2 border-dashed">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => addStep('heading')}>
            <Heading className="w-4 h-4" /> Título
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => addStep('text')}>
            <Type className="w-4 h-4" /> Texto
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => addStep('checkbox')}>
            <CheckSquare className="w-4 h-4" /> Checkbox
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => addStep('single_choice')}>
            <List className="w-4 h-4" /> Única
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => addStep('image')}>
            <ImageIcon className="w-4 h-4" /> Imagem
          </Button>
        </div>
      </div>

      <div className="fixed bottom-6 right-6 flex gap-2">
        <Button size="lg" className="rounded-full shadow-xl gap-2 px-8" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Salvando...' : 'Salvar Instrução'}
        </Button>
      </div>
    </div>
  );
};
