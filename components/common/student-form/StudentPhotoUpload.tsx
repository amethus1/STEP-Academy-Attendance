import React, { useRef } from 'react';
import { CameraIcon, UserCircleIcon } from '../../icons/Icons';

interface StudentPhotoUploadProps {
    photoUrl: string | null;
    onPhotoChange: (url: string | null) => void;
}

export const StudentPhotoUpload: React.FC<StudentPhotoUploadProps> = ({ photoUrl, onPhotoChange }) => {
    const photoInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 256;
                const MAX_HEIGHT = 256;
                let { width, height } = img;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL(file.type);
                    onPhotoChange(dataUrl);
                }
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="md:col-span-1 flex flex-col items-center">
            <input type="file" accept="image/*" ref={photoInputRef} onChange={handlePhotoChange} className="hidden" />
            <div className="w-40 h-40 rounded-full bg-slate-200 dark:bg-slate-700 mb-2 flex items-center justify-center overflow-hidden">
                {photoUrl ? <img src={photoUrl} alt="Student" className="w-full h-full object-cover" /> : <UserCircleIcon className="w-24 h-24 text-slate-400" />}
            </div>
            <button type="button" onClick={() => photoInputRef.current?.click()} className="inline-flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600">
                <CameraIcon className="h-4 w-4" /> {photoUrl ? 'Change Photo' : 'Upload Photo'}
            </button>
        </div>
    );
};
