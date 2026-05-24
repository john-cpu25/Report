import React from 'react';
import { Loader2 } from 'lucide-react';

export default function ModalSaveButton({ 
  onClick, 
  disabled, 
  isSaving, 
  saveSuccess, 
  defaultText = 'Save',
  savingText = 'Saving...',
  successText = 'Saved!',
  type = 'submit'
}) {
  return (
    <button 
      type={type}
      onClick={onClick}
      disabled={disabled || isSaving || saveSuccess}
      className="btn-modal-save"
    >
      {isSaving ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          <span>{savingText}</span>
        </>
      ) : saveSuccess ? (
        <span>{successText}</span>
      ) : (
        <span>{defaultText}</span>
      )}
    </button>
  );
}
