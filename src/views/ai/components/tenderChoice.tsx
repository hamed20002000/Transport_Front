import React, { useState } from 'react';
import { Box, Button, Modal, Typography } from '@mui/material';
import { TenderChoiceProps } from '../ai.types';



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

const buttonManualStyle: React.CSSProperties = {
    padding: '2px 5px',
    borderRadius: 8,
    border: '1px solid #ccc',
    background: 'rgb(190, 38, 22)',
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

const TenderChoice: React.FC<TenderChoiceProps> = ({
    onManual,
    setVoiceInput

}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleExcelClick = () => {
        setIsModalOpen(true);
    };

    const handleConfirmDownload = () => {
        setIsModalOpen(false);
        //downloadTemplate();
        setVoiceInput("güncelleme")
    };

    return (
        <div style={containerStyle}>
            <button style={buttonExcelStyle} onClick={handleExcelClick} title="Download Excel template">
                Excel dosyasını indirin
            </button>

            <button
                style={buttonManualStyle}
                onClick={() => onManual?.()}
                title="Manual entry"
            >
                Manuel giriş
            </button>

            <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <Box sx={modalStyle}>
                    <Typography variant="h6" component="h2" sx={{ mb: 2, textAlign: "center" }}>
                        Bilgileri girdikten sonra şablonu yükleyin ve güncelleme düğmesine tıklayın.
                    </Typography>

                    <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        onClick={handleConfirmDownload}
                        href="/tender_template.xlsx"
                        download="ihale_sablonu.xlsx"

                    >
                        İndir
                    </Button>
                </Box>
            </Modal>
        </div>
    );
};

export default TenderChoice;



