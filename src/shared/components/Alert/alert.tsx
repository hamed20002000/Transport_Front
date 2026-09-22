import { Stack, Alert as UiAlert } from 'src/shared/components/compat';
import { AlertType } from "src/shared/components/Alert/alert.type.ts"






const Alert = ({ onClose, severity, alertMessage }: AlertType) => {

    return (
        <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
            <UiAlert severity={severity} onClose={onClose}>
                {alertMessage}
            </UiAlert>
        </Stack>
    )
}

export default Alert





