import React, { useState } from 'react';
import { Box, Button, Modal, Typography } from 'src/shared/components/compat';
import { TenderChoiceProps } from 'src/features/ai-agent/types/index.ts';



const containerStyle: React.CSSProperties = {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
};

const buttonExcelStyle: React.CSSProperties = {
    padding: '2px 5px',
    borderRadius: 8,
    border: '1px solid #ccc',
    background: '#1a58a0',
    cursor: 'pointer',
    color: 'white',
    fontSize: '13px',
};

const modalStyle = {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 420,
    bgcolor: 'background.paper',
    boxShadow: 24,
    borderRadius: 2,
    p: 4,
};

const NetworkChoice: React.FC<TenderChoiceProps> = ({
    setVoiceInput
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleExcelClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setIsModalOpen(true);
    };

    const handleConfirmDownload = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setIsModalOpen(false);
        setVoiceInput('به‌روزرسانی');
    };

    return (
        <div style={containerStyle}>
            <button style={buttonExcelStyle} onClick={handleExcelClick} title="دانلود قالب اکسل">
                دانلود فایل اکسل
            </button>

            {/* <button
                style={buttonManualStyle}
                onClick={() => onManual?.()}
                title="ورود دستی"
            >
                ورود دستی
            </button> */}

            <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <Box sx={modalStyle}>
                    <Typography variant="h6" component="h2" sx={{ mb: 2, textAlign: "center" }}>
                        پس از وارد کردن اطلاعات، قالب را بارگذاری کنید و دکمه به‌روزرسانی را بزنید.
                    </Typography>

                    <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        onClick={handleConfirmDownload}
                          href="/ŞEBEKE-KANAL-TR.xlsx"
                          download="قالب-شبکه-کانال.xlsx"
                    >
                        دانلود
                    </Button>
                </Box>
            </Modal>
        </div>
    );
};

export default NetworkChoice;



