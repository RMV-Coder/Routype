'use client';
import * as React from 'react';
import { Link } from '@mui/material';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import Image from 'next/image';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button'
import Box from '@mui/material/Box';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
  } from "@/components/ui/card";

interface AuthResponse {
  error?: string;
  type?: string;
}

const providers = [
    { id: 'credentials', name: 'Email & Password' },
    //{ id: 'passkey', name: 'Passkey'}
    // { id: 'github', name: 'GitHub' },
    // { id: 'google', name: 'Google' },
];
async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = (formData.get('name') as string) || '';
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    if(!email || !password){
        alert('Email and password are required');
        return;
    }
    try{
        const res = await fetch('/api/auth/signup',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if(!res.ok){
            alert(data?.error || 'Sign up failed');
            return;
        }
        // Optionally sign in automatically with credentials (handled by NextAuth credentials provider)
        // window.location.href = '/auth/signin';
        alert('Account created. Please sign in.');
    }catch(err){
        alert('Unexpected error');
    }
}

function SignUpForm () {
    return (
        <Box
            component="form"
            id="signup-form"
            onSubmit={handleSubmit}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
            }}
        >
            <TextField size="small" id="name" name="name" label="Name" type="text" />
            <TextField size="small" id="email" name="email" label="Email" type="email" />
            <TextField size="small" id="password" name="password" label="Password" type="password" />
            <Button variant="outlined" size="small" type="submit">Sign up</Button>
        </Box>
    );
}
function SignInLink () {
    return(
    <span style={{ fontSize: '0.8rem' }}>
        Already have an account?&nbsp;<Link href="/auth/signin">Sign in</Link>
    </span>);
}
function AppTitle() {
    return (
        // <code className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-xxl font-semibold">
        // Routype
        // </code>
        <AspectRatio ratio={109 / 33} style={{alignSelf:'center', justifySelf:'center'}}>
            <Image src="/logo_routype.svg" alt="Image" width={218} height={66} className="rounded-md object-cover" />
        </AspectRatio>
    );
}
// function DemoInfo() {
//   return (
//     <Alert severity="info">
//       You can use <strong>toolpad-demo@mui.com</strong> with the password <strong>@demo1</strong> to
//       test
//     </Alert>
//   );
// }
// Create a wrapper function for signUp
export default function SignUp(){

    // const signUp = async (
    //     provider: AuthProvider, 
    //     formData: FormData, 
    //     callbackUrl?: string | undefined):Promise<AuthResponse> => {
    //     const providerId = provider.id;
    //     if (providerId === 'passkey') {
    //     // try {
    //     //   return await webauthnSignIn('passkey', {
    //     //     email: formData.get('email'),
    //     //     callbackUrl: callbackUrl || '/',
    //     //   });
    //     // } catch (error) {
    //     //   console.error(error);
    //     //   return {
    //     //     error: (error as Error)?.message || 'Something went wrong',
    //     //     type: 'WebAuthnError',
    //     //   };
    //     // }
    //     }
    //     if(['github', 'google'].includes(providerId)){
    //         try{
    //             const res = await nextAuthSignIn(providerId, {
    //                 callbackUrl: callbackUrl || '/', // Redirect after login
    //             });
    //             // If `redirect: false` were used, you could just inspect `res.error`
    //             // But by default, it redirects, so we just return success unless error
    //             if(res?.error){
    //                 return {
    //                     error: res.error,
    //                 };
    //             }
    //             return {};
    //         } catch (error) {
    //             console.error(`OAuth sign-in failed for ${providerId}: `, error);
    //             return {
    //                 error: 'Authentication failed'
    //             }
    //         }
    //     }

    //     if(providerId === 'credentials'){
    //         const email = formData.get('email') as string;
    //         const password = formData.get('password') as string;
    //         if(!email || !password){
    //             return { error: 'Email and password are required.'}
    //         }
    //         try{
    //             const res = await nextAuthSignIn('credentials', {
    //                 email,
    //                 password,
    //                 redirect: false,
    //                 callbackUrl: callbackUrl || '/',
    //             });
    //             if(res?.error){
    //                 return { error: res.error};
    //             }
    //             router.push(res?.url || '/');
    //             router.refresh();

    //             return {};
    //         } catch (error){
    //             console.error(error);
    //             return {
    //                 error: 'Login request failed'
    //             };
    //         }
    //     }
    //     return {
    //         error: 'Unsupported provider'
    //     };
    // };
    return (
        <Card>
            <CardHeader>
                <AppTitle />
            </CardHeader>
            <CardContent>
                <SignUpForm />
                <SignInLink />
            </CardContent>
        </Card>

        // <SignInPage 
        //     providers={providers} 
        //     signIn={signIn} 
        //     slotProps={{
        //         emailField: {
        //             autoFocus: true
        //         },
        //         form: { 
        //             noValidate: false
        //         }, 
        //         passwordField:{
        //             autoFocus:false
        //         },
        //         signUpLink:{
        //             component: SignUpLink
        //         }
        //     }}
        //     slots={{
        //         forgotPasswordLink: ForgotPasswordLink,
        //         signUpLink: SignUpLink,
        //         title: AppTitle
        //         // subtitle: DemoInfo
        //     }}
        ///>
    );
}