import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { X } from 'lucide-react';

interface MeasurementModalProps {
  isOpen: boolean;
  onClose: () => void;
  garmentType: string;
  customerId: string;
  customerName: string;
  selectedGarments: string[];
  onSave: (measurements: Record<string, string>) => void;
}

interface MeasurementField {
  name: string;
  label: string;
  unit: 'inches' | 'text';
}

const measurementFields: Record<string, { sections: { title: string; fields: MeasurementField[] }[] }> = {
  shirt: {
    sections: [
      {
        title: "Body Measurements",
        fields: [
          { name: 'chest', label: 'CHEST', unit: 'inches' },
          { name: 'length', label: 'LENGTH', unit: 'inches' },
          { name: 'shoulder', label: 'SHOULDER', unit: 'inches' },
          { name: 'sleeve', label: 'SLEEVE', unit: 'inches' },
          { name: 'collar', label: 'COLLAR', unit: 'inches' },
          { name: 'waist', label: 'WAIST', unit: 'inches' },
        ]
      },
      {
        title: "Style & Details",
        fields: [
          { name: 'fitting_style', label: 'FITTING STYLE', unit: 'text' },
          { name: 'pocket', label: 'POCKET', unit: 'text' },
          { name: 'color', label: 'COLOR', unit: 'text' },
        ]
      },
      {
        title: "Production Details",
        fields: [
          { name: 'cutting_master', label: 'CUTTING MASTER', unit: 'text' },
          { name: 'worker', label: 'WORKER', unit: 'text' },
          { name: 'others', label: 'OTHERS', unit: 'text' },
        ]
      }
    ]
  },
  pant: {
    sections: [
      {
        title: "Body Measurements",
        fields: [
          { name: 'waist', label: 'WAIST', unit: 'inches' },
          { name: 'hip', label: 'HIP', unit: 'inches' },
          { name: 'length', label: 'PANT LENGTH', unit: 'inches' },
          { name: 'bottom', label: 'BOTTOM', unit: 'inches' },
          { name: 'thigh', label: 'THIGH', unit: 'inches' },
          { name: 'knee', label: 'KNEE', unit: 'inches' },
        ]
      },
      {
        title: "Style & Details",
        fields: [
          { name: 'pocket_style', label: 'POCKET STYLE', unit: 'text' },
          { name: 'fitting_style', label: 'FITTING STYLE', unit: 'text' },
          { name: 'color', label: 'COLOR', unit: 'text' },
        ]
      },
      {
        title: "Production Details",
        fields: [
          { name: 'cutting_master', label: 'CUTTING MASTER', unit: 'text' },
          { name: 'worker', label: 'WORKER', unit: 'text' },
          { name: 'others', label: 'OTHERS', unit: 'text' },
        ]
      }
    ]
  },
  kurta: {
    sections: [
      {
        title: "Body Measurements",
        fields: [
          { name: 'chest', label: 'CHEST', unit: 'inches' },
          { name: 'length', label: 'KURTA LENGTH', unit: 'inches' },
          { name: 'shoulder', label: 'SHOULDER', unit: 'inches' },
          { name: 'sleeve', label: 'SLEEVE', unit: 'inches' },
          { name: 'collar', label: 'COLLAR', unit: 'inches' },
        ]
      },
      {
        title: "Style & Details",
        fields: [
          { name: 'fitting_style', label: 'FITTING STYLE', unit: 'text' },
          { name: 'pocket', label: 'POCKET', unit: 'text' },
          { name: 'color', label: 'COLOR', unit: 'text' },
        ]
      },
      {
        title: "Production Details",
        fields: [
          { name: 'cutting_master', label: 'CUTTING MASTER', unit: 'text' },
          { name: 'worker', label: 'WORKER', unit: 'text' },
          { name: 'others', label: 'OTHERS', unit: 'text' },
        ]
      }
    ]
  },
  pajama: {
    sections: [
      {
        title: "Body Measurements",
        fields: [
          { name: 'waist', label: 'WAIST', unit: 'inches' },
          { name: 'length', label: 'PAJAMA LENGTH', unit: 'inches' },
          { name: 'bottom', label: 'BOTTOM', unit: 'inches' },
        ]
      },
      {
        title: "Style & Details",
        fields: [
          { name: 'fitting_style', label: 'FITTING STYLE', unit: 'text' },
          { name: 'color', label: 'COLOR', unit: 'text' },
        ]
      },
      {
        title: "Production Details",
        fields: [
          { name: 'cutting_master', label: 'CUTTING MASTER', unit: 'text' },
          { name: 'worker', label: 'WORKER', unit: 'text' },
          { name: 'others', label: 'OTHERS', unit: 'text' },
        ]
      }
    ]
  },
  coat: {
    sections: [
      {
        title: "Body Measurements",
        fields: [
          { name: 'chest', label: 'CHEST', unit: 'inches' },
          { name: 'waist', label: 'WAIST', unit: 'inches' },
          { name: 'hip', label: 'HIP', unit: 'inches' },
          { name: 'length', label: 'COAT LENGTH', unit: 'inches' },
          { name: 'shoulder', label: 'SHOULDER', unit: 'inches' },
          { name: 'sleeve', label: 'SLEEVE', unit: 'inches' },
        ]
      },
      {
        title: "Style & Details",
        fields: [
          { name: 'fitting_style', label: 'FITTING STYLE', unit: 'text' },
          { name: 'pocket', label: 'POCKET', unit: 'text' },
          { name: 'color', label: 'COLOR', unit: 'text' },
        ]
      },
      {
        title: "Production Details",
        fields: [
          { name: 'cutting_master', label: 'CUTTING MASTER', unit: 'text' },
          { name: 'worker', label: 'WORKER', unit: 'text' },
          { name: 'others', label: 'OTHERS', unit: 'text' },
        ]
      }
    ]
  },
  bandi: {
    sections: [
      {
        title: "Body Measurements",
        fields: [
          { name: 'chest', label: 'CHEST', unit: 'inches' },
          { name: 'length', label: 'BANDI LENGTH', unit: 'inches' },
          { name: 'shoulder', label: 'SHOULDER', unit: 'inches' },
        ]
      },
      {
        title: "Style & Details",
        fields: [
          { name: 'fitting_style', label: 'FITTING STYLE', unit: 'text' },
          { name: 'color', label: 'COLOR', unit: 'text' },
        ]
      },
      {
        title: "Production Details",
        fields: [
          { name: 'cutting_master', label: 'CUTTING MASTER', unit: 'text' },
          { name: 'worker', label: 'WORKER', unit: 'text' },
          { name: 'others', label: 'OTHERS', unit: 'text' },
        ]
      }
    ]
  },
  westcot: {
    sections: [
      {
        title: "Body Measurements",
        fields: [
          { name: 'chest', label: 'CHEST', unit: 'inches' },
          { name: 'waist', label: 'WAIST', unit: 'inches' },
          { name: 'length', label: 'LENGTH', unit: 'inches' },
        ]
      },
      {
        title: "Style & Details",
        fields: [
          { name: 'fitting_style', label: 'FITTING STYLE', unit: 'text' },
          { name: 'color', label: 'COLOR', unit: 'text' },
        ]
      },
      {
        title: "Production Details",
        fields: [
          { name: 'cutting_master', label: 'CUTTING MASTER', unit: 'text' },
          { name: 'worker', label: 'WORKER', unit: 'text' },
          { name: 'others', label: 'OTHERS', unit: 'text' },
        ]
      }
    ]
  }
};

const MeasurementModal: React.FC<MeasurementModalProps> = ({
  isOpen,
  onClose,
  garmentType,
  customerId,
  customerName,
  selectedGarments,
  onSave
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedGarmentType, setSelectedGarmentType] = useState<string>(garmentType);
  const [measurements, setMeasurements] = useState<Record<string, string>>({});

  const garmentConfig = measurementFields[selectedGarmentType.toLowerCase()] || measurementFields.shirt;

  // Initialize measurements when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialMeasurements: Record<string, string> = {};
      garmentConfig.sections.forEach(section => {
        section.fields.forEach(field => {
          initialMeasurements[field.name] = '';
        });
      });
      setMeasurements(initialMeasurements);
      setSelectedGarmentType(garmentType);
    }
  }, [isOpen, garmentType, selectedGarmentType]);

  const handleMeasurementChange = (fieldName: string, value: string) => {
    setMeasurements(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSave = async () => {
    if (!customerId) {
      toast({
        title: 'Error',
        description: 'Customer ID is required to save measurements',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Convert measurements to proper format
      const processedMeasurements: Record<string, any> = {};
      Object.entries(measurements).forEach(([key, value]) => {
        const allFields = garmentConfig.sections.flatMap(section => section.fields);
        const field = allFields.find(f => f.name === key);
        if (field?.unit === 'inches' && value) {
          processedMeasurements[key] = parseFloat(value) || 0;
        } else {
          processedMeasurements[key] = value;
        }
      });

      // Map new garment types to existing database enum values
      let dbClothingType: "shirt" | "pant" | "kurta_pajama" | "suit" | "blouse" | "saree_blouse";
      const garmentLower = selectedGarmentType.toLowerCase();
      
      if (garmentLower === 'shirt') {
        dbClothingType = 'shirt';
      } else if (garmentLower === 'pant') {
        dbClothingType = 'pant';
      } else if (garmentLower === 'kurta' || garmentLower === 'pajama') {
        dbClothingType = 'kurta_pajama';
      } else if (garmentLower === 'coat' || garmentLower === 'bandi' || garmentLower === 'westcot') {
        dbClothingType = 'suit';
      } else {
        dbClothingType = 'shirt'; // default fallback
      }

      const { data, error } = await supabase
        .from('measurements')
        .insert({
          customer_id: customerId,
          clothing_type: dbClothingType,
          measurements: processedMeasurements,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Measurements saved successfully!',
      });

      onSave(measurements);
      onClose();
    } catch (error: any) {
      console.error('Error saving measurements:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save measurements',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    const clearedMeasurements: Record<string, string> = {};
    garmentConfig.sections.forEach(section => {
      section.fields.forEach(field => {
        clearedMeasurements[field.name] = '';
      });
    });
    setMeasurements(clearedMeasurements);
    toast({
      title: 'Cleared',
      description: 'All measurements have been cleared',
    });
  };

  const renderField = (field: MeasurementField) => {
    if (field.unit === 'text') {
      return (
        <Input
          value={measurements[field.name] || ''}
          onChange={(e) => handleMeasurementChange(field.name, e.target.value)}
          className="w-40 bg-white border-gray-900 text-black font-semibold"
          placeholder="Enter text"
        />
      );
    } else {
      return (
        <Input
          type="number"
          step="0.25"
          value={measurements[field.name] || ''}
          onChange={(e) => handleMeasurementChange(field.name, e.target.value)}
          className="w-40 bg-white border-gray-900 text-black font-semibold"
          placeholder="0.00"
        />
      );
    }
  };

  const getAvailableGarmentTypes = () => {
    const availableTypes = [];
    selectedGarments.forEach(garment => {
      const garmentLower = garment.toLowerCase();
      if (garmentLower.includes('shirt') && !garmentLower.includes('pant') && !garmentLower.includes('neharu')) {
        availableTypes.push({ value: 'shirt', label: 'Shirt' });
      } else if (garmentLower.includes('pant') || garmentLower.includes('wizar')) {
        availableTypes.push({ value: 'pant', label: 'Pant' });
      } else if (garmentLower.includes('neharu') || garmentLower.includes('kurta')) {
        availableTypes.push({ value: 'kurta', label: 'Kurta' });
      } else if (garmentLower.includes('pajama')) {
        availableTypes.push({ value: 'pajama', label: 'Pajama' });
      } else if (garmentLower.includes('coat')) {
        availableTypes.push({ value: 'coat', label: 'Coat' });
      } else if (garmentLower.includes('bandi')) {
        availableTypes.push({ value: 'bandi', label: 'Bandi' });
      } else if (garmentLower.includes('westcot')) {
        availableTypes.push({ value: 'westcot', label: 'Westcot' });
      }
    });
    
    const uniqueTypes = availableTypes.filter((type, index, self) => 
      index === self.findIndex(t => t.value === type.value)
    );
    
    return uniqueTypes.length > 0 ? uniqueTypes : [
      { value: 'shirt', label: 'Shirt' },
      { value: 'pant', label: 'Pant' },
      { value: 'kurta', label: 'Kurta' },
      { value: 'pajama', label: 'Pajama' },
      { value: 'coat', label: 'Coat' },
      { value: 'bandi', label: 'Bandi' },
      { value: 'westcot', label: 'Westcot' }
    ];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-6xl max-h-[90vh] translate-x-[-50%] translate-y-[-50%] gap-4 border-2 border-gray-900 bg-white p-6 shadow-lg duration-200 sm:rounded-lg overflow-y-auto">
        
        {/* Header Section */}
        <div className="relative -mx-6 -mt-6 mb-6 bg-gradient-to-r from-gray-900 to-gray-800 p-6 border-b-4 border-gray-900">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white text-center tracking-wide">
              MEASUREMENT DETAILS
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4 text-center">
            <p className="text-white text-lg font-semibold">Customer: {customerName}</p>
          </div>
        </div>

        {/* Garment Type Selection */}
        <div className="flex justify-center items-center space-x-4 mb-6">
          <Label className="text-lg font-bold text-gray-900">Garment Type:</Label>
          <Select value={selectedGarmentType} onValueChange={setSelectedGarmentType}>
            <SelectTrigger className="w-40 bg-white border-gray-900 text-black font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getAvailableGarmentTypes().map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Measurements Grid with Professional Layout - Organized by Sections */}
        <div className="space-y-8">
          {garmentConfig.sections.map((section, sectionIndex) => (
            <div key={section.title} className="space-y-4">
              {/* Section Header */}
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-3 rounded-lg border-2 border-gray-900">
                <h3 className="text-lg font-bold text-center uppercase tracking-wide">
                  {section.title}
                </h3>
              </div>
              
              {/* Section Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {section.fields.map((field) => (
                  <div key={field.name} className="grid grid-cols-2 gap-2 items-center">
                    <Label className="bg-gray-800 text-white px-3 py-2 rounded font-bold text-xs text-center uppercase tracking-wide">
                      {field.label}
                    </Label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons with Black and White Theme */}
        <div className="flex justify-center space-x-4 mt-8 pt-6 border-t-2 border-gray-900">
          <Button
            onClick={handleClear}
            variant="outline"
            className="border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white px-8 py-3 font-bold"
          >
            Clear All
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 font-bold"
          >
            Save Measurements
          </Button>
          
          <Button
            onClick={onClose}
            variant="outline"
            className="border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white px-8 py-3 font-bold"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MeasurementModal;
