import { useFieldArray, Control } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { ArvoreItem } from "./ArvoreItem";

interface ArvoreFoto {
  id?: string;
  url: string;
}

interface ArvoreData {
  latitude: number;
  longitude: number;
  endereco?: string;
  observacao?: string;
  especieFinal?: string;
  especieConfiancaMedia?: number;
  fotos: ArvoreFoto[];
}

interface ArvoresFieldArrayProps {
  control: Control<any>;
  name: string;
  form: any; // React Hook Form instance
  onPhotoAdded?: (index: number, photoUrl: string) => void;
}

export function ArvoresFieldArray({ 
  control, 
  name, 
  form,
  onPhotoAdded
}: ArvoresFieldArrayProps) {
  const { fields, append, remove, update } = useFieldArray({
    control,
    name,
  });

  const addArvore = () => {
    // Use slightly randomized coordinates to avoid overlapping markers
    const baseLatitude = -23.2017;
    const baseLongitude = -47.2911;
    const randomOffset = 0.001; // ~100 meters
    
    const newArvore: ArvoreData = {
      latitude: baseLatitude + (Math.random() - 0.5) * randomOffset,
      longitude: baseLongitude + (Math.random() - 0.5) * randomOffset,
      endereco: "",
      observacao: "",
      especieFinal: "",
      especieConfiancaMedia: undefined,
      fotos: []
    };
    append(newArvore);
  };

  const updateArvore = (index: number, updates: Partial<ArvoreData>) => {
    // Atualizar cada campo individualmente no form
    Object.keys(updates).forEach(key => {
      const value = updates[key as keyof ArvoreData];
      if (value !== undefined) {
        form.setValue(`${name}.${index}.${key}` as any, value);
      }
    });
    
    console.log(`updateArvore chamado:`, { index, updates });
    
    // Força re-renderização
    update(index, { ...fields[index], ...updates } as any);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Árvores desta Nota</span>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-normal text-gray-600">
              {fields.length} árvore(s) adicionada(s)
            </span>
            <Button
              type="button"
              onClick={addArvore}
              data-testid="button-add-arvore"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar árvore
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {fields.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhuma árvore adicionada ainda.</p>
            <p className="text-sm">Clique em "Adicionar árvore" para começar.</p>
          </div>
        ) : (
          fields.map((field, index) => (
            <ArvoreItem
              key={field.id}
              index={index}
              arvore={field as unknown as ArvoreData}
              onUpdate={updateArvore}
              onRemove={remove}
              onPhotoAdded={onPhotoAdded}
              form={form}
              fieldName={name}
            />
          ))
        )}
        
        {fields.length > 0 && (
          <div className="text-center">
            <Button
              type="button"
              variant="outline"
              onClick={addArvore}
              data-testid="button-add-arvore-bottom"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar outra árvore
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}