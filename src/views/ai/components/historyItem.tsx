import { useState, type ChangeEvent } from 'react';
import type { SessionsItemType } from '../ai.types';
import EditIcon from '@mui/icons-material/Edit';
import SaveAsIcon from '@mui/icons-material/SaveAs';
import { useNavigate } from 'react-router';
import axios from 'axios';


type HistoryItemProps = SessionsItemType & {
    getToolExecution: (sessionId: string) => void;
    status?: 'success' | 'error';
};

const HistoryItem: React.FC<HistoryItemProps> = ({ id, title, getToolExecution, status = 'success' }) => {

    //#region ------------------ Constants -----------------
    const navigate = useNavigate();

    //#endregion --------------- Constants -----------------

    //#region ------------------ States --------------------
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(title);
    //#endregion --------------- States --------------------

    const onChange = (event: ChangeEvent<HTMLInputElement>) => {
        setText(event.target.value);
    };

    const onSave = async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate('/');
            return;
        }

        try {
            await axios.put(
                `http://localhost:3001/api/agent/sessions/changename`,
                {
                    sessionId: id,
                    name: text
                },
                {
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authToken}`
                    }
                }
            );
            setEditing(false);
        } catch (error) {
            // no-op
        }
    };

    const stopPropagation = (event: React.MouseEvent) => {
        event.stopPropagation();
    };

    const onEditToggle = (event: React.MouseEvent) => {
        stopPropagation(event);
        setEditing((prev) => !prev);
    };

    const onSaveClick = async (event: React.MouseEvent) => {
        stopPropagation(event);
        await onSave();
    };

    return (
        <div onClick={() => getToolExecution(id)} className={`historyItem historyItem--${status}`}>
            <div className="historyItem__content">
                {editing ? (
                    <input
                        className="historyItem__input"
                        value={text}
                        onChange={onChange}
                        onClick={(event) => event.stopPropagation()}
                    />
                ) : (
                    <span className="historyItem__text">{text}</span>
                )}
            </div>

            <span className="historyItem__action">
                {editing ? (
                    <SaveAsIcon className="historyItem__icon" fontSize="small" onClick={onSaveClick} />
                ) : (
                    <EditIcon className="historyItem__icon" fontSize="small" onClick={onEditToggle} />
                )}
            </span>
        </div>
    )
};

export default HistoryItem;



