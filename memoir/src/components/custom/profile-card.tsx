import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Avatar, Skeleton, IconButton } from "@mui/material";
import { Profile } from "@/lib/definitions";
import CropOriginalIcon from '@mui/icons-material/CropOriginal';
export const ProfileCard:React.FC<Profile> = ({name, image}) => {
    
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
            <CardFooter>
            </CardFooter>
        </Card>
    );
}