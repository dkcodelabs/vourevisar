
import React from 'react';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

interface SubmitButtonProps {
  isSubmitting: boolean;
  disabled: boolean;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({ isSubmitting, disabled }) => {
  return (
    <div className="pt-4">
      <Button 
        type="submit"
        disabled={disabled}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Registrando...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Registrar Questões
          </>
        )}
      </Button>
    </div>
  );
};

export default SubmitButton;
