import { useState } from "react";
import { styled } from '@mui/material/styles';
import { Divider, Paper, ToggleButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemButton, ListItemText, ListItemAvatar, Avatar, TextField, IconButton } from "@mui/material";
import ToggleButtonGroup, { toggleButtonGroupClasses } from '@mui/material/ToggleButtonGroup';
import { useSocket } from "@/hooks/use-socket";
import { Copy, Share2, Users } from "lucide-react";

// Mock online friends - replace with actual socket presence data
const mockOnlineFriends = [
    { id: "1", name: "Alice", avatar: "A" },
    { id: "2", name: "Bob", avatar: "B" },
    { id: "3", name: "Charlie", avatar: "C" },
];

const StyledToggleButtonGroup = styled(ToggleButtonGroup)(({ theme }) => ({
    [`& .${toggleButtonGroupClasses.grouped}`]: {
      margin: theme.spacing(0.5),
      border: 0,
      borderRadius: theme.shape.borderRadius,
      [`&.${toggleButtonGroupClasses.disabled}`]: {
        border: 0,
      },
    },
    [`& .${toggleButtonGroupClasses.middleButton},& .${toggleButtonGroupClasses.lastButton}`]:
      {
        marginLeft: -1,
        borderLeft: '1px solid transparent',
      },
  }));

export default function TypeArenaSettings() {
    const [mode, setMode] = useState<string>('Time');
    const [length, setLength] = useState<string>('Short');
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [inviteLink, setInviteLink] = useState("");
    const [socketState] = useSocket();

    const handleMode = (event: React.MouseEvent<HTMLElement>, newMode: string) => {
        setMode(newMode);
    };
    const handleLength = (event: React.MouseEvent<HTMLElement>, newLength: string,) => {
        setLength(newLength);
    };

    const handleInviteFriend = (friendId: string) => {
        // TODO: Emit socket event to invite friend
        console.log("Inviting friend:", friendId);
        setInviteModalOpen(false);
    };

    const handleCreateInviteLink = () => {
        // TODO: Generate JWT invite token
        const token = "invite_" + Date.now() + "_" + Math.random().toString(36).slice(2);
        const link = `${window.location.origin}/typearena/invite/${token}`;
        setInviteLink(link);
    };

    const handleCopyInviteLink = () => {
        navigator.clipboard.writeText(inviteLink);
        // TODO: Replace with proper toast
        alert("Invite link copied to clipboard!");
    };

    return (
        <div className="space-y-4">
            <Paper elevation={0} sx={{display:'flex', border:'0', flexWrap:'wrap'}}>
                <StyledToggleButtonGroup size="small" exclusive value={mode} onChange={handleMode}>
                    <ToggleButton value={"Time"}>
                        {"Time"}
                    </ToggleButton>
                    <ToggleButton value={"Words"}>
                        {"Words"}
                    </ToggleButton>
                    <ToggleButton value={"Zen"}>
                        {"Zen"}
                    </ToggleButton>
                    <ToggleButton value={"Challenger"}>
                        {"Challenger"}
                    </ToggleButton>
                </StyledToggleButtonGroup>
                <Divider flexItem orientation="vertical" sx={{mx: 0.5, my: 1}}/>
                <StyledToggleButtonGroup size="small" exclusive value={length} onChange={handleLength}>
                    <ToggleButton value={"All"}>
                        {"All"}
                    </ToggleButton>
                    <ToggleButton value={"Short"}>
                        {"Words"}
                    </ToggleButton>
                    <ToggleButton value={"Long"}>
                        {"Long"}
                    </ToggleButton>
                    <ToggleButton value={"Epic"}>
                        {"Epic"}
                    </ToggleButton>
                </StyledToggleButtonGroup>
            </Paper>

            <div className="flex gap-2">
                <Button 
                    variant="outlined" 
                    startIcon={<Users />}
                    onClick={() => setInviteModalOpen(true)}
                >
                    Invite Friends
                </Button>
            </div>

            {/* Invite Modal */}
            <Dialog open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Invite Friends to TypeArena</DialogTitle>
                <DialogContent>
                    <div className="space-y-4 mt-2">
                        <div>
                            <h3 className="font-medium mb-2">Online Friends</h3>
                            <List>
                                {mockOnlineFriends.map((friend) => (
                                    <ListItemButton key={friend.id} onClick={() => handleInviteFriend(friend.id)}>
                                        <ListItemAvatar>
                                            <Avatar>{friend.avatar}</Avatar>
                                        </ListItemAvatar>
                                        <ListItemText primary={friend.name} secondary="Online" />
                                    </ListItemButton>
                                ))}
                            </List>
                        </div>
                        
                        <Divider />
                        
                        <div>
                            <h3 className="font-medium mb-2">Create Invite Link</h3>
                            <div className="flex gap-2">
                                <TextField 
                                    fullWidth 
                                    value={inviteLink} 
                                    placeholder="Click 'Generate' to create invite link"
                                    InputProps={{ readOnly: true }}
                                />
                                <Button onClick={handleCreateInviteLink} variant="outlined">
                                    Generate
                                </Button>
                                {inviteLink && (
                                    <IconButton onClick={handleCopyInviteLink} title="Copy link">
                                        <Copy size={16} />
                                    </IconButton>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setInviteModalOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}