import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { X, Printer } from 'lucide-react';

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
         
          { name: 'length', label: 'LENGTH', unit: 'inches' },
           { name: 'chest', label: 'CHEST', unit: 'inches' },
            { name: 'waist', label: 'WAIST', unit: 'inches' },
          { name: 'hip', label: 'HIP', unit: 'inches' },
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

        ]
      },
      {
        title: "Production Details",
        fields: [
          { name: 'cutting_master', label: 'CUTTING MASTER', unit: 'text' },
          { name: 'worker', label: 'WORKER', unit: 'text' },
          { name: 'customer', label: 'CUSTOMER DEMAND', unit: 'text' },
        ]
      }
    ]
  },
  pant: {
    sections: [
      {
        title: "Body Measurements",
        fields: [
            { name: 'length', label: 'PANT LENGTH', unit: 'inches' },
          { name: 'waist', label: 'WAIST', unit: 'inches' },
          { name: 'hip', label: 'HIP', unit: 'inches' },
             { name: 'high', label: 'HIGH', unit: 'inches' },
          { name: 'thigh', label: 'THIGH', unit: 'inches' },
          { name: 'knee', label: 'KNEE', unit: 'inches' },
          { name: 'mohari', label: 'MOHARI', unit: 'inches' }
  
        ]
      },
      {
        title: "Style & Details",
        fields: [
          { name: 'pocket_style', label: 'POCKET STYLE', unit: 'text' },
          { name: 'fitting_style', label: 'FITTING STYLE', unit: 'text' },
          
        ]
      },
      {
        title: "Production Details",
        fields: [
          { name: 'cutting_master', label: 'CUTTING MASTER', unit: 'text' },
          { name: 'worker', label: 'WORKER', unit: 'text' },
         
        ]
      }
    ]
  },
  kurta: {
    sections: [
      {
        title: "Body Measurements",
        fields: [
          
          { name: 'length', label: 'KURTA LENGTH', unit: 'inches' },
          { name: 'chest', label: 'CHEST', unit: 'inches' },
          { name: 'waist', label: 'Waist', unit: 'inches' },
              { name: 'hip', label: 'Hip', unit: 'inches' },
          { name: 'shoulder', label: 'SHOULDER', unit: 'inches' },
          { name: 'sleeve', label: 'SLEEVE', unit: 'inches' },
          { name: 'mohair/cuff', label: 'Mohair/Cuff ', unit: 'inches' },
        ]
      },
      {
        title: "Style & Details",
        fields: [
          { name: 'fitting_style', label: 'FITTING STYLE', unit: 'text' },
          { name: 'pocket', label: 'POCKET', unit: 'text' },
         
        ]
      },
      {
        title: "Production Details",
        fields: [
          { name: 'cutting_master', label: 'CUTTING MASTER', unit: 'text' },
          { name: 'worker', label: 'WORKER', unit: 'text' },
          
        ]
      }
    ]
  },
  pajama: {
    sections: [
      {
        title: "Body Measurements",
        fields: [
          { name: 'length', label: 'PAJAMA LENGTH', unit: 'inches' },
          { name: 'waist', label: 'WAIST', unit: 'inches' },
          { name: 'bottom', label: 'BOTTOM', unit: 'inches' },
        ]
      },
      {
        title: "Style & Details",
        fields: [
          { name: 'fitting_style', label: 'FITTING STYLE', unit: 'text' },
     
        ]
      },
      {
        title: "Production Details",
        fields: [
          { name: 'cutting_master', label: 'CUTTING MASTER', unit: 'text' },
          { name: 'worker', label: 'WORKER', unit: 'text' },
         
        ]
      }
    ]
  },
  coat: {
    sections: [
      {
        title: "Body Measurements",
        fields: [
           { name: 'length', label: 'COAT LENGTH', unit: 'inches' },
          { name: 'chest', label: 'CHEST', unit: 'inches' },
          { name: 'waist', label: 'WAIST', unit: 'inches' },
          { name: 'hip', label: 'HIP', unit: 'inches' },
         
          { name: 'shoulder', label: 'SHOULDER', unit: 'inches' },
          { name: 'mohari', label: 'MOHARI', unit: 'inches' },
          { name: 'collar', label: 'COLLAR', unit: 'inches'},
        ]
      },
      {
        title: "Style & Details",
        fields: [
          { name: 'fitting_style', label: 'FITTING STYLE', unit: 'text' },
          { name: 'pocket', label: 'POCKET', unit: 'text' },
         
        ]
      },
      {
        title: "Production Details",
        fields: [
          { name: 'cutting_master', label: 'CUTTING MASTER', unit: 'text' },
          { name: 'worker', label: 'WORKER', unit: 'text' },
       
        ]
      }
    ]
  },
  bandi: {
    sections: [
      {
        title: "Body Measurements",
        fields: [
            { name: 'length', label: 'BANDI LENGTH', unit: 'inches' },
          { name: 'chest', label: 'CHEST', unit: 'inches' },
         { name: 'waist', label: 'WAIST', unit: 'inches' },
          { name: 'hip', label: 'HIP', unit: 'inches' },
          { name: 'shoulder', label: 'SHOULDER', unit: 'inches' },
          { name: 'collar', label: 'COLLAR', unit: 'inches' },
        ]
      },
      {
        title: "Style & Details",
        fields: [
          { name: 'fitting_style', label: 'FITTING STYLE', unit: 'text' },
          
        ]
      },
      {
        title: "Production Details",
        fields: [
          { name: 'cutting_master', label: 'CUTTING MASTER', unit: 'text' },
          { name: 'worker', label: 'WORKER', unit: 'text' },
          
        ]
      }
    ]
  },
  westcot: {
    sections: [
      {
        title: "Body Measurements",
        fields: [
           { name: 'length', label: 'LENGTH', unit: 'inches' },
          { name: 'chest', label: 'CHEST', unit: 'inches' },
          { name: 'waist', label: 'WAIST', unit: 'inches' },
          { name: 'hip', label: 'HIP', unit: 'inches' },
          { name: 'shoulder', label: 'SHOULDER', unit: 'inches' },
          { name: 'collar', label: 'COLLAR', unit: 'inches' },
        ]
      },
      {
        title: "Style & Details",
        fields: [
          { name: 'fitting_style', label: 'FITTING STYLE', unit: 'text' },
         
        ]
      },
      {
        title: "Production Details",
        fields: [
          { name: 'cutting_master', label: 'CUTTING MASTER', unit: 'text' },
          { name: 'worker', label: 'WORKER', unit: 'text' },
         
        ]
      }
    ]
  },
  non_denim_pant: {
  sections: [
    {
      title: "Body Measurements",
      fields: [
        { name: "length", label: "LENGTH", unit: "inches" },
        { name: "waist", label: "WAIST", unit: "inches" },
        { name: "hip", label: "HIP", unit: "inches" },
        { name: "thigh", label: "THIGH", unit: "inches" },
        { name: "knee", label: "KNEE", unit: "inches" },
        { name: "bottom", label: "BOTTOM", unit: "inches" },
        { name: "pocket", label: "POCKET", unit: "inches" }
      ]
    },
    {
      title: "Style & Details",
      fields: [
        { name: "fit_type", label: "FIT TYPE", unit: "text" }, 
        { name: "pleats", label: "PLEATS (Yes/No)", unit: "text" },
        { name: "pocket_style", label: "POCKET STYLE", unit: "text" }
      ]
    },
    {
      title: "Production Details",
      fields: [
        { name: "cutting_master", label: "CUTTING MASTER", unit: "text" },
        { name: "worker", label: "WORKER", unit: "text" }
        
      ]
    }
  ]
},
short_kurta: {
    sections: [
      {
        title: "Body Measurements",
        fields: [
          { name: 'length', label: 'SHORT KURTA LENGTH', unit: 'inches' },
          { name: 'chest', label: 'CHEST', unit: 'inches' },
          { name: 'waist', label: 'WAIST', unit: 'inches' },
          { name: 'hip', label: 'HIP', unit: 'inches' },
          { name: 'shoulder', label: 'SHOULDER', unit: 'inches' },
          { name: 'sleeve', label: 'SLEEVE', unit: 'inches' },
          { name: 'collar', label: 'COLLAR', unit: 'inches' },
          { name: 'mohair/cuff', label: 'MOHAIR/CUFF', unit: 'inches' },
        ]
      },
      {
        title: "Style & Details",
        fields: [
          { name: 'fitting_style', label: 'FITTING STYLE', unit: 'text' },
          { name: 'pocket', label: 'POCKET', unit: 'text' },
          { name: 'pattern', label: 'PATTERN', unit: 'text' },
          { name: 'placket_style', label: 'PLACKET STYLE', unit: 'text' },
        ]
      },
      {
        title: "Production Details",
        fields: [
          { name: 'cutting_master', label: 'CUTTING MASTER', unit: 'text' },
          { name: 'worker', label: 'WORKER', unit: 'text' },
          { name: 'special_notes', label: 'SPECIAL NOTES', unit: 'text' },
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
  const [measurements, setMeasurements] = useState<Record<string, string>>({});

  const garmentConfig = measurementFields[garmentType.toLowerCase()] || measurementFields.shirt;

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
    }
  }, [isOpen, garmentType, garmentConfig]);

  const handleMeasurementChange = (fieldName: string, value: string) => {
    setMeasurements(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSave = async () => {
    // Check if this is a temp customer (measurements will be saved later with the customer)
    if (!customerId || customerId === 'temp-customer') {
      toast({
        title: 'Measurements Recorded',
        description: 'Measurements have been recorded and will be saved when you save the customer record.',
      });
      onSave(measurements);
      onClose();
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
      const garmentLower = garmentType.toLowerCase();
      
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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Error',
        description: 'Unable to open print window. Please check your browser settings.',
        variant: 'destructive',
      });
      return;
    }

    const currentDate = new Date().toLocaleDateString('en-IN');
    
    // Generate measurements HTML
    const measurementsHTML = garmentConfig.sections.map(section => {
      const filledFields = section.fields.filter(field => measurements[field.name]);
      if (filledFields.length === 0) return '';
      
      return `
        <div class="section">
          <h3 class="section-title">${section.title}</h3>
          <table class="measurements-table">
            ${filledFields.map(field => `
              <tr>
                <td class="label">${field.label}:</td>
                <td class="value">${measurements[field.name]}${field.unit === 'inches' ? '"' : ''}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      `;
    }).filter(section => section).join('');

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Customer Measurements - ${customerName}</title>
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
          
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.4;
            color: #333;
          }
          
          .header {
            text-align: center;
            border-bottom: 3px solid #333;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          
          .company-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .company-subtitle {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
          }
          
          .customer-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          
          .customer-info h2 {
            margin: 0 0 10px 0;
            font-size: 18px;
            color: #333;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          
          .garment-title {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            margin: 20px 0;
            padding: 10px;
            background: #333;
            color: white;
            border-radius: 5px;
          }
          
          .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          
          .section-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
            padding: 8px 12px;
            background: #f1f1f1;
            border-left: 4px solid #333;
          }
          
          .measurements-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          
          .measurements-table td {
            padding: 8px 12px;
            border: 1px solid #ddd;
          }
          
          .measurements-table .label {
            background: #f8f9fa;
            font-weight: bold;
            width: 40%;
          }
          
          .measurements-table .value {
            background: white;
            width: 60%;
          }
          
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #333;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          
          .signature-section {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
          }
          
          .signature-box {
            width: 45%;
            text-align: center;
            border-top: 1px solid #333;
            padding-top: 10px;
            font-size: 12px;
          }
          
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">A1 Tailor & Designer</div>
          <div class="company-subtitle">Gents-Ladies Tailor & Fashion Designer</div>
          <div class="company-subtitle">Belwatika, Near Mohi Tailors, Daltonganj | Mob: 7482621237, 9525519989</div>
        </div>
        
        <div class="customer-info">
          <h2>Customer Measurements</h2>
          <div class="info-row">
            <span><strong>Customer Name:</strong> ${customerName}</span>
            <span><strong>Date:</strong> ${currentDate}</span>
          </div>
          <div class="info-row">
            <span><strong>Garment Type:</strong> ${garmentType.toUpperCase()}</span>
            <span><strong>Customer ID:</strong> ${customerId !== 'temp-customer' ? customerId : 'N/A'}</span>
          </div>
        </div>
        
        <div class="garment-title">MEASUREMENT ${garmentType.toUpperCase()}</div>
        
        ${measurementsHTML}
        
        ${measurementsHTML ? '' : '<div style="text-align: center; padding: 40px; color: #666;">No measurements recorded yet.</div>'}
        
        <div class="signature-section">
          <div class="signature-box">
            Customer Signature
          </div>
          <div class="signature-box">
            Tailor Signature
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Thank You for choosing A1 Tailor & Designer!</strong></p>
          <p>Quality Tailoring Services • Professional Stitching • Customer Satisfaction</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Small delay to ensure content is loaded before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);

    toast({
      title: 'Print Initiated',
      description: 'Measurement details sent to printer.',
    });
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
        <div className="w-full">
          <Textarea
            value={measurements[field.name] || ''}
            onChange={(e) => handleMeasurementChange(field.name, e.target.value)}
            className="w-full min-h-[60px] bg-white border-gray-900 text-black font-semibold resize-y"
            placeholder="Enter text and resize as needed..."
          />
        </div>
      );
    } else {
      return (
        <Input
          type="number"
          step="0.25"
          value={measurements[field.name] || ''}
          onChange={(e) => handleMeasurementChange(field.name, e.target.value)}
          className="w-full bg-white border-gray-900 text-black font-semibold"
          placeholder="0.00"
        />
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-6xl max-h-[90vh] translate-x-[-50%] translate-y-[-50%] gap-4 border-2 border-gray-900 bg-white p-6 shadow-lg duration-200 sm:rounded-lg overflow-y-auto">
        
        {/* Header Section */}
        <div className="relative -mx-6 -mt-6 mb-6 bg-gradient-to-r from-gray-900 to-gray-800 p-6 border-b-4 border-gray-900">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white text-center tracking-wide">
              MEASUREMENT {garmentType ? garmentType.toUpperCase() : 'DETAILS'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4 text-center">
            <p className="text-white text-lg font-semibold">Customer: {customerName}</p>
          </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {section.fields.map((field) => (
                  <div key={field.name} className="space-y-2">
                    <Label className="bg-gray-800 text-white px-3 py-2 rounded font-bold text-xs text-center uppercase tracking-wide block w-full">
                      {field.label}
                    </Label>
                    <div className="w-full">
                      {renderField(field)}
                    </div>
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
            onClick={handlePrint}
            variant="outline"
            className="border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white px-8 py-3 font-bold flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print Measurements
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
