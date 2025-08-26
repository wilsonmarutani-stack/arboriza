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
  onIdentifySpecies?: (index: number) => void;
}

export function ArvoresFieldArray({ 
  control, 
  name, 
  onIdentifySpecies 
}: ArvoresFieldArrayProps) {
  const { fields, append, remove, update } = useFieldArray({
    control,
    name,
  });

  const addArvore = () => {
    const newArvore: ArvoreData = {
      latitude: -23.2017, // Default coordinates (Itu region)
      longitude: -47.2911,
      endereco: "",
      observacao: "",
      especieFinal: "",
      especieConfiancaMedia: undefined,
      fotos: []
    };
    append(newArvore);
  };

  const updateArvore = (index: number, updates: Partial<ArvoreData>) => {
    const currentArvore = fields[index] as unknown as ArvoreData;
    update(index, { ...currentArvore, ...updates });
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
              onIdentifySpecies={onIdentifySpecies}
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