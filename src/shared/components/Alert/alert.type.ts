import { AlertColor } from 'src/shared/components/compat';



export type AlertType={
    onClose: () => void,
    severity: AlertColor, 
    alertMessage: string 
}