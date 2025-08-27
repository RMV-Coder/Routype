import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Avatar, Skeleton, IconButton, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { Profile } from "@/lib/definitions";
import CropOriginalIcon from '@mui/icons-material/CropOriginal';
import { useState, useTransition } from "react";

type ProfileCardProps = Profile & { showActions?: boolean };

export const ProfileCard:React.FC<ProfileCardProps> = ({name, image, showActions = false}) => {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [pending, startTransition] = useTransition();

    const handleSendMessage = async () => {
        startTransition(async () => {
            await fetch('/api/messages/dm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otherUserId: null, initialMessage: message }) // TODO: pass viewed user id
            });
            setOpen(false);
            setMessage("");
        });
    };

    return (
        <Card className="m-4" style={{display:'flex'}}>
            <CardHeader>
            </CardHeader>
            <CardContent style={{alignSelf:'center', justifySelf:'center', justifyItems:'center'}}>
                {!name?<Skeleton width={150} height={150} variant="circular"/>:<Avatar
                        alt={name}
                        src={image}
                        sx={{ width: 150, height: 150 }}
                        // badgeContent={
                        //     <IconButton><CropOriginalIcon fontSize="medium"/></IconButton>
                        // }
                        />}
                <h1>{name}</h1>
                <p>Some bio...</p>
            </CardContent>
            {showActions && (
                <>
                    <CardFooter>
                        <div className="flex gap-2">
                            <Button variant="contained" size="small">Add Friend</Button>
                            <Button variant="outlined" size="small" onClick={() => setOpen(true)}>Send Message</Button>
                        </div>
                    </CardFooter>
                    <Dialog open={open} onClose={() => setOpen(false)}>
                        <DialogTitle>Send a message</DialogTitle>
                        <DialogContent>
                            <TextField
                                autoFocus
                                fullWidth
                                multiline
                                minRows={3}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Write your message"
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setOpen(false)}>Cancel</Button>
                            <Button onClick={handleSendMessage} disabled={pending || !message.trim()}>Send</Button>
                        </DialogActions>
                    </Dialog>
                </>
            )}
        </Card>
    );
}