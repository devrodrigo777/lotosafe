import React, { useState } from 'react';
import { db, collection, addDoc, serverTimestamp, updateDoc, doc, handleFirestoreError, OperationType } from '@/firebase';
import { Instruction, InstructionStep, Company } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical, Save, Type, CheckSquare, Image as ImageIcon, List, Heading, Upload, Link as LinkIcon, Loader2, Minus, EyeOff, Eye, Palette } from 'lucide-react';
import { motion, Reorder, useDragControls } from 'motion/react';
import { useLocation } from '@/contexts/LocationContext';
import { toast } from 'sonner';
import { ConfirmationModal } from './ConfirmationModal';

interface StepItemProps {
  step: InstructionStep;
  displayNumber: number | null;
  updateStep: (id: string, updates: Partial<InstructionStep>) => void;
  removeStep: (id: string) => void;
  handleImageUpload: (id: string, file: File) => void;
}

const StepItem: React.FC<StepItemProps> = ({ 
  step, 
  displayNumber, 
  updateStep, 
  removeStep, 
  handleImageUpload 
}) => {
  const dragControls = useDragControls();

  return (
    <Reorder.Item 
      value={step} 
      dragListener={false} 
      dragControls={dragControls}
    >
      <Card className={`relative group overflow-hidden transition-colors ${
        step.backgroundColor === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
        step.backgroundColor === 'blue' ? 'bg-blue-50 border-blue-200' :
        step.backgroundColor === 'red' ? 'bg-red-50 border-red-200' :
        step.backgroundColor === 'green' ? 'bg-green-50 border-green-200' :
        step.backgroundColor === 'orange' ? 'bg-orange-50 border-orange-200' :
        'bg-white'
      }`}>
        <CardContent className="p-4 flex gap-4">
          <div className="flex flex-col items-center gap-2 pt-2">
            <div 
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-primary transition-colors p-1"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <GripVertical className="w-5 h-5" />
            </div>
            {displayNumber !== null && (
              <div className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">
                {displayNumber}
              </div>
            )}
            <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeStep(step.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
            
            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {[
                { name: 'white', class: 'bg-white border' },
                { name: 'yellow', class: 'bg-yellow-100' },
                { name: 'blue', class: 'bg-blue-100' },
                { name: 'red', class: 'bg-red-100' },
                { name: 'green', class: 'bg-green-100' },
                { name: 'orange', class: 'bg-orange-100' }
              ].map((color) => (
                <button
                  key={color.name}
                  className={`w-4 h-4 rounded-full ${color.class} ${step.backgroundColor === color.name ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                  onClick={() => updateStep(step.id, { backgroundColor: color.name })}
                  title={`Cor ${color.name}`}
                />
              ))}
            </div>
          </div>
          
          <div className="flex-1 space-y-4">
            <div className="flex gap-2 items-center">
              {step.type === 'separator' ? (
                <div className="flex-1 h-px bg-slate-200 my-4" />
              ) : step.type === 'text' ? (
                <Textarea
                  value={step.label || ''}
                  onChange={(e) => updateStep(step.id, { label: e.target.value })}
                  placeholder="Descreva o passo de segurança..."
                  className="min-h-[80px]"
                />
              ) : (
                <Input 
                  value={step.label || ''} 
                  onChange={(e) => updateStep(step.id, { label: e.target.value })} 
                  placeholder={step.type === 'heading' ? 'Título da Seção' : 'Descreva o passo de segurança...'}
                  className={step.type === 'heading' ? 'font-bold text-lg' : ''}
                />
              )}
              <div className="flex flex-col gap-1">
                <Badge variant="outline" className="capitalize h-fit">{step.type}</Badge>
                {step.type !== 'heading' && step.type !== 'separator' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`h-7 px-2 text-[10px] gap-1 ${step.hideNumber ? 'text-amber-600 bg-amber-50' : 'text-muted-foreground'}`}
                    onClick={() => updateStep(step.id, { hideNumber: !step.hideNumber })}
                  >
                    {step.hideNumber ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {step.hideNumber ? 'Nº Oculto' : 'Mostrar Nº'}
                  </Button>
                )}
              </div>
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
                      placeholder="Cole o link da imagem ou dê Ctrl+V para colar um print..." 
                      value={step.value?.url || ''}
                      onChange={(e) => updateStep(step.id, { value: { ...step.value, url: e.target.value } })}
                      onPaste={(e) => {
                        const item = e.clipboardData.items[0];
                        if (item?.type.includes('image')) {
                          const file = item.getAsFile();
                          if (file) handleImageUpload(step.id, file);
                        }
                      }}
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
                      value={opt || ''} 
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
    </Reorder.Item>
  );
};

export const InstructionEditor = ({ companyId, onSave, initialData }: { companyId: string, onSave: (id: string) => void, initialData?: Instruction }) => {
  const [equipmentName, setEquipmentName] = useState(initialData?.equipmentName || '');
  const [location, setLocation] = useState(initialData?.location || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [steps, setSteps] = useState<InstructionStep[]>(initialData?.steps || []);
  const [saving, setSaving] = useState(false);

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

  const addHeaderSteps = () => {
    const headerStep: InstructionStep = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'single_choice',
      label: 'Aplicação de bloqueio',
      required: true,
      options: [
        "1. Notificar o operador",
        "2. Desligue corretamente a máquina.",
        "3. Isole todas as fontes de energia.",
        "4. Aplique dispositivos de bloqueio, travas e etiquetas.",
        "5. Verifique se todas as fontes descritas nesse mapa de bloqueio foram totalmente desenergizadas."
      ]
    };
    setSteps([...steps, headerStep]);
  };

  const addFooterSteps = () => {
    const footerStep: InstructionStep = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'single_choice',
      label: 'Processo de Retirada do Bloqueio',
      required: true,
      options: [
        "1. Verifique se todas as ferramentas e todos os itens foram retirados.",
        "2. Confirme se todos os funcionários estão em local seguro.",
        "3. Verifique se os controles estão na posição neutra.",
        "4. Retire os dispositivos de bloqueio e torne a energizar a máquina.",
        "5. Avise os operadores de que o trabalho foi concluído."
      ]
    };
    setSteps([...steps, footerStep]);
  };

  const removeStep = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Remover Passo",
      description: "Tem certeza que deseja remover este passo da instrução?",
      variant: 'destructive',
      onConfirm: () => {
        setSteps(steps.filter(s => s.id !== id));
      }
    });
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
      toast.error('Por favor, preencha o nome do equipamento e adicione pelo menos um passo.');
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
          location,
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
          location,
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Nome do Equipamento</Label>
              <Input value={equipmentName || ''} onChange={(e) => setEquipmentName(e.target.value)} placeholder="Ex: Prensa Hidráulica P-01" />
            </div>
            <div className="space-y-2">
              <Label>Local</Label>
              <Input value={location || ''} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Setor de Estamparia" />
            </div>
            <div className="space-y-2">
              <Label>Categoria/Tag</Label>
              <Input value={category || ''} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Elétrica, Mecânica..." />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <List className="w-5 h-5" />
          Passos da Instrução
        </h3>
        
        <Reorder.Group axis="y" values={steps} onReorder={setSteps} className="space-y-4">
          {(() => {
            let currentNumber = 0;
            return steps.map((step) => {
              const shouldShowNumber = step.type !== 'heading' && step.type !== 'separator' && !step.hideNumber;
              const displayNumber = shouldShowNumber ? ++currentNumber : null;
              
              return (
                <StepItem 
                  key={step.id} 
                  step={step} 
                  displayNumber={displayNumber} 
                  updateStep={updateStep} 
                  removeStep={removeStep} 
                  handleImageUpload={handleImageUpload}
                />
              );
            });
          })()}
        </Reorder.Group>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 p-4 bg-muted/30 rounded-xl border-2 border-dashed">
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
          <Button variant="outline" size="sm" className="gap-2" onClick={() => addStep('separator')}>
            <Minus className="w-4 h-4" /> Separador
          </Button>
          <Button variant="secondary" size="sm" className="gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" onClick={addHeaderSteps}>
            <Heading className="w-4 h-4" /> Cabeçalho
          </Button>
          <Button variant="secondary" size="sm" className="gap-2 bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200" onClick={addFooterSteps}>
            <Heading className="w-4 h-4" /> Rodapé
          </Button>
        </div>
      </div>

      <div className="fixed bottom-6 right-6 flex gap-2">
        <Button size="lg" className="rounded-full shadow-xl gap-2 px-8" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Salvando...' : 'Salvar Instrução'}
        </Button>
      </div>

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
