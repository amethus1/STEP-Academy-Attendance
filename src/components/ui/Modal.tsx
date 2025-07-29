import React from 'react';
import XIcon from '../icons/XIcon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<Props> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg p-6 bg-white rounded-lg shadow-xl dark:bg-gray-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-4 border-b dark:border-gray-700">
          <h3 className="text-xl font-semibold dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:bg-gray-200 hover:text-gray-900 rounded-lg p-1.5 dark:hover:bg-gray-600"
          >
            <XIcon className="w-5 h-5" />
            <span className="sr-only">Close modal</span>
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
};

export default Modal;