import { Button, DialogActions, DialogContent, DialogContentText, DialogTitle } from 'src/shared/components/compat';


type DeleteConfirmProps ={
    pendingConfirmation: any;
    handleConfirmAction:  (confirmed: boolean)=>void
};

const DeleteConfirm=({handleConfirmAction,pendingConfirmation}:DeleteConfirmProps) => {

    return (
      <>
       <DialogTitle id="confirm-delete-dialog-title" textAlign={"center"}>Onay gerekli</DialogTitle>
                            <DialogContent>
                                <DialogContentText style={{ textAlign: "center" }}>
                                    {pendingConfirmation?.message || 'Bu işlem silme işlemi yapacaktır. Devam etmek istediğinize emin misiniz?'}
                                </DialogContentText>
                            </DialogContent>
                            <DialogActions style={{ justifyContent: "center", display: "flex" }}>
                                <Button onClick={() => handleConfirmAction(false)} color="inherit" style={{ background: "#be1919", color: "white" }}>
                                    Hayır
                                </Button>
                                <Button onClick={() => handleConfirmAction(true)} color="inherit" style={{ background: "#4a974a", color: "white" }} variant="contained" autoFocus>
                                    Evet, devam et
                                </Button>
                            </DialogActions>
                            </>
    )
};

export default DeleteConfirm;






