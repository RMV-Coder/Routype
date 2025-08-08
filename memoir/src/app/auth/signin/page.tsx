'use client';
import * as React from 'react';
import type { AuthProvider } from '@toolpad/core';
// import Link from '@mui/material/Link';
import { Link } from '@mui/material';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import Image from 'next/image';
import { SignInPage } from '@toolpad/core/SignInPage';
import { signIn as nextAuthSignIn } from 'next-auth/react'; 
import { useRouter } from 'next/navigation';
// import { signIn as webauthnSignIn } from 'next-auth/webauthn';
// import { providerMap } from '../../../auth';
// import serverSignIn from './actions';

interface AuthResponse {
  error?: string;
  type?: string;
}

const providers = [
    { id: 'credentials', name: 'Email & Password' },
    //{ id: 'passkey', name: 'Passkey'}
    { id: 'github', name: 'GitHub' },
    { id: 'google', name: 'Google' },
];

function SignUpLink () {
    return(
    <span style={{ fontSize: '0.8rem' }}>
        Don&apos;t have an account?&nbsp;<Link href="/auth/signup">Sign up</Link>
    </span>);
}
function ForgotPasswordLink() {
  return (
    <span>
      <Link fontSize="0.75rem" href="/auth/forgot-password">
        Forgot password?
      </Link>
    </span>
  );
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
// Create a wrapper function for signIn
export default function SignIn(){
    const router = useRouter();

    const signIn = async (
        provider: AuthProvider, 
        formData: FormData, 
        callbackUrl?: string | undefined):Promise<AuthResponse> => {
        const providerId = provider.id;
        if (providerId === 'passkey') {
        // try {
        //   return await webauthnSignIn('passkey', {
        //     email: formData.get('email'),
        //     callbackUrl: callbackUrl || '/',
        //   });
        // } catch (error) {
        //   console.error(error);
        //   return {
        //     error: (error as Error)?.message || 'Something went wrong',
        //     type: 'WebAuthnError',
        //   };
        // }
        }
        if(['github', 'google'].includes(providerId)){
            try{
                const res = await nextAuthSignIn(providerId, {
                    callbackUrl: callbackUrl || '/feed', // Redirect after login
                });
                // If `redirect: false` were used, you could just inspect `res.error`
                // But by default, it redirects, so we just return success unless error
                if(res?.error){
                    return {
                        error: res.error,
                    };
                }
                return {};
            } catch (error) {
                console.error(`OAuth sign-in failed for ${providerId}: `, error);
                return {
                    error: 'Authentication failed'
                }
            }
        }

        if(providerId === 'credentials'){
            const email = formData.get('email') as string;
            const password = formData.get('password') as string;
            if(!email || !password){
                return { error: 'Email and password are required.'}
            }
            try{
                const res = await nextAuthSignIn('credentials', {
                    email,
                    password,
                    redirect: false,
                    callbackUrl: callbackUrl || '/feed',
                });
                if(res?.error){
                    return { error: res.error};
                }
                router.push(res?.url || '/feed');
                router.refresh();

                return {};
            } catch (error){
                console.error(error);
                return {
                    error: 'Login request failed'
                };
            }
        }
        return {
            error: 'Unsupported provider'
        };
    };
    return (
        <SignInPage 
            providers={providers} 
            signIn={signIn} 
            slotProps={{
                emailField: {
                    autoFocus: true
                },
                form: { 
                    noValidate: false
                }, 
                passwordField:{
                    autoFocus:false
                },
                signUpLink:{
                    component: SignUpLink
                }
            }}
            slots={{
                forgotPasswordLink: ForgotPasswordLink,
                signUpLink: SignUpLink,
                title: AppTitle
                // subtitle: DemoInfo
            }}
        />
    );
}