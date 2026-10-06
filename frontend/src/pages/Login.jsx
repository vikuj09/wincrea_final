import React, { useState } from 'react';
import {
  LogIn,
  UserPlus,
  Mail,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Clock3,
  RefreshCw,
} from 'lucide-react';

import { useApp } from '../context/AppContext';

const API_URL =
  (import.meta.env.VITE_API_URL || '/api');


// ============================================================
// LOGIN
// ============================================================

export default function Login() {

  const {
    login,
  } = useApp();


  // ==========================================================
  // SCREEN
  // ==========================================================

  const [
    screen,
    setScreen,
  ] = useState('LOGIN');

  /*
    LOGIN
    REGISTER
    VERIFY_REGISTER
    PENDING
    FORGOT_PASSWORD
    VERIFY_RESET
    RESET_PASSWORD
  */


  // ==========================================================
  // LOGIN STATE
  // ==========================================================

  const [
    email,
    setEmail,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');


  // ==========================================================
  // REGISTER STATE
  // ==========================================================

  const [
    registerName,
    setRegisterName,
  ] = useState('');

  const [
    registerEmail,
    setRegisterEmail,
  ] = useState('');

  const [
    registerOtp,
    setRegisterOtp,
  ] = useState('');

  const [
    registerPassword,
    setRegisterPassword,
  ] = useState('');

  const [
    registerPasswordConfirm,
    setRegisterPasswordConfirm,
  ] = useState('');


  // ==========================================================
  // PASSWORD RESET STATE
  // ==========================================================

  const [
    resetEmail,
    setResetEmail,
  ] = useState('');

  const [
    resetOtp,
    setResetOtp,
  ] = useState('');

  const [
    resetPassword,
    setResetPassword,
  ] = useState('');

  const [
    resetPasswordConfirm,
    setResetPasswordConfirm,
  ] = useState('');


  // ==========================================================
  // COMMON STATE
  // ==========================================================

  const [
    error,
    setError,
  ] = useState('');

  const [
    success,
    setSuccess,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] = useState(false);


  function clearMessages() {
    setError('');
    setSuccess('');
  }


  function goTo(
    nextScreen
  ) {

    clearMessages();
    setScreen(
      nextScreen
    );
  }


  // ==========================================================
  // LOGIN
  // ==========================================================

  async function handleLogin(
    e
  ) {

    e.preventDefault();

    clearMessages();
    setLoading(true);


    try {

      await login(
        email.trim().toLowerCase(),
        password
      );

    } catch (err) {

      setError(
        err?.message ||
        'Login failed.'
      );

    } finally {

      setLoading(false);
    }
  }


  // ==========================================================
  // REGISTER
  // ==========================================================

  async function handleRegister(
    e
  ) {

    e.preventDefault();

    clearMessages();


    const name =
      registerName.trim();

    const gmail =
      registerEmail
        .trim()
        .toLowerCase();


    if (!name) {

      setError(
        'Name is required.'
      );

      return;
    }


    if (
      !gmail.endsWith(
        '@gmail.com'
      )
    ) {

      setError(
        'Please use a Gmail address.'
      );

      return;
    }


    setLoading(true);


    try {

      const response =
        await fetch(
          `${API_URL}/auth/register`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                name,
                email: gmail,
              }),
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.message ||
          'Registration failed.'
        );
      }


      setRegisterEmail(
        gmail
      );


      setSuccess(
        data.message ||
        'OTP sent to your Gmail.'
      );


      setScreen(
        'VERIFY_REGISTER'
      );

    } catch (err) {

      setError(
        err?.message ||
        'Registration failed.'
      );

    } finally {

      setLoading(false);
    }
  }


  // ==========================================================
  // VERIFY REGISTRATION
  // ==========================================================

  async function handleVerifyRegistration(
    e
  ) {

    e.preventDefault();

    clearMessages();


    if (
      registerOtp.trim().length !==
      6
    ) {

      setError(
        'Enter the 6-digit OTP.'
      );

      return;
    }


    if (
      registerPassword.length <
      6
    ) {

      setError(
        'Password must be at least 6 characters.'
      );

      return;
    }


    if (
      registerPassword !==
      registerPasswordConfirm
    ) {

      setError(
        'Passwords do not match.'
      );

      return;
    }


    setLoading(true);


    try {

      const response =
        await fetch(
          `${API_URL}/auth/register/verify`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({

                email:
                  registerEmail
                    .trim()
                    .toLowerCase(),

                otp:
                  registerOtp.trim(),

                password:
                  registerPassword,

              }),
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.message ||
          'Verification failed.'
        );
      }


      setScreen(
        'PENDING'
      );

      clearMessages();

    } catch (err) {

      setError(
        err?.message ||
        'Verification failed.'
      );

    } finally {

      setLoading(false);
    }
  }


  // ==========================================================
  // FORGOT PASSWORD
  // ==========================================================

  async function handleForgotPassword(
    e
  ) {

    e.preventDefault();

    clearMessages();


    const gmail =
      resetEmail
        .trim()
        .toLowerCase();


    if (
      !gmail.endsWith(
        '@gmail.com'
      )
    ) {

      setError(
        'Please use a Gmail address.'
      );

      return;
    }


    setLoading(true);


    try {

      const response =
        await fetch(
          `${API_URL}/auth/forgot-password`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                email:
                  gmail,
              }),
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.message ||
          'Failed to send reset OTP.'
        );
      }


      setResetEmail(
        gmail
      );

      setSuccess(
        data.message ||
        'If an account exists, an OTP has been sent.'
      );


      setScreen(
        'VERIFY_RESET'
      );

    } catch (err) {

      setError(
        err?.message ||
        'Failed to send reset OTP.'
      );

    } finally {

      setLoading(false);
    }
  }


  // ==========================================================
  // VERIFY RESET OTP + MOVE TO PASSWORD SCREEN
  // ==========================================================
  //
  // The backend combines OTP validation with password reset.
  // We therefore keep the OTP in state and submit both on the
  // final reset step.
  // ==========================================================


  function continueReset() {

    clearMessages();


    if (
      resetOtp.trim().length !==
      6
    ) {

      setError(
        'Enter the 6-digit OTP.'
      );

      return;
    }


    setScreen(
      'RESET_PASSWORD'
    );
  }


  // ==========================================================
  // RESET PASSWORD
  // ==========================================================

  async function handleResetPassword(
    e
  ) {

    e.preventDefault();

    clearMessages();


    if (
      resetPassword.length <
      6
    ) {

      setError(
        'Password must be at least 6 characters.'
      );

      return;
    }


    if (
      resetPassword !==
      resetPasswordConfirm
    ) {

      setError(
        'Passwords do not match.'
      );

      return;
    }


    setLoading(true);


    try {

      const response =
        await fetch(
          `${API_URL}/auth/reset-password`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({

                email:
                  resetEmail
                    .trim()
                    .toLowerCase(),

                otp:
                  resetOtp.trim(),

                password:
                  resetPassword,

              }),
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.message ||
          'Password reset failed.'
        );
      }


      setSuccess(
        'Password reset successfully. You can now sign in.'
      );


      setEmail(
        resetEmail
      );

      setPassword(
        ''
      );

      setResetOtp(
        ''
      );

      setResetPassword(
        ''
      );

      setResetPasswordConfirm(
        ''
      );

      setScreen(
        'LOGIN'
      );

    } catch (err) {

      setError(
        err?.message ||
        'Password reset failed.'
      );

    } finally {

      setLoading(false);
    }
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="min-h-screen flex items-center justify-center bg-paper px-4 py-8">

      <div className="w-full max-w-md">

        {/* BRAND */}

        <div className="text-center mb-6">

          <img
            src="/window-creators-logo.png"
            alt="Window Creators"
            className="
              mx-auto
              w-28
              h-28
              object-contain
            "
          />

          <h1 className="font-display text-2xl mt-3">
            Window Creators
          </h1>

          <p className="text-sm text-ink-700/60 mt-1">
            WINCREA ERP
          </p>

        </div>


        <div className="card p-8">

          {/* ==================================================
              LOGIN
          ================================================== */}

          {screen === 'LOGIN' && (

            <LoginScreen
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              loading={loading}
              error={error}
              success={success}
              onSubmit={handleLogin}
              onRegister={() =>
                goTo('REGISTER')
              }
              onForgot={() => {
                setResetEmail('');
                goTo('FORGOT_PASSWORD');
              }}
            />

          )}


          {/* ==================================================
              REGISTER
          ================================================== */}

          {screen === 'REGISTER' && (

            <RegisterScreen
              name={registerName}
              setName={setRegisterName}
              email={registerEmail}
              setEmail={setRegisterEmail}
              loading={loading}
              error={error}
              onSubmit={
                handleRegister
              }
              onBack={() =>
                goTo('LOGIN')
              }
            />

          )}


          {/* ==================================================
              VERIFY REGISTRATION
          ================================================== */}

          {screen === 'VERIFY_REGISTER' && (

            <OtpScreen
              title="Verify your Gmail"
              subtitle={
                `We sent a 6-digit OTP to ${registerEmail}`
              }
              otp={registerOtp}
              setOtp={setRegisterOtp}
              loading={loading}
              error={error}
              success={success}
              password={registerPassword}
              setPassword={
                setRegisterPassword
              }
              passwordConfirm={
                registerPasswordConfirm
              }
              setPasswordConfirm={
                setRegisterPasswordConfirm
              }
              showPassword
              onSubmit={
                handleVerifyRegistration
              }
              onBack={() =>
                goTo('REGISTER')
              }
            />

          )}


          {/* ==================================================
              PENDING APPROVAL
          ================================================== */}

          {screen === 'PENDING' && (

            <PendingScreen
              email={
                registerEmail
              }
              onBack={() =>
                goTo('LOGIN')
              }
            />

          )}


          {/* ==================================================
              FORGOT PASSWORD
          ================================================== */}

          {screen === 'FORGOT_PASSWORD' && (

            <ForgotPasswordScreen
              email={resetEmail}
              setEmail={setResetEmail}
              loading={loading}
              error={error}
              success={success}
              onSubmit={
                handleForgotPassword
              }
              onBack={() =>
                goTo('LOGIN')
              }
            />

          )}


          {/* ==================================================
              VERIFY RESET OTP
          ================================================== */}

          {screen === 'VERIFY_RESET' && (

            <OtpOnlyScreen
              title="Enter reset OTP"
              subtitle={
                `Enter the 6-digit OTP sent to ${resetEmail}`
              }
              otp={resetOtp}
              setOtp={setResetOtp}
              loading={false}
              error={error}
              success={success}
              onSubmit={
                continueReset
              }
              onBack={() =>
                goTo('FORGOT_PASSWORD')
              }
            />

          )}


          {/* ==================================================
              RESET PASSWORD
          ================================================== */}

          {screen === 'RESET_PASSWORD' && (

            <ResetPasswordScreen
              password={
                resetPassword
              }
              setPassword={
                setResetPassword
              }
              passwordConfirm={
                resetPasswordConfirm
              }
              setPasswordConfirm={
                setResetPasswordConfirm
              }
              loading={loading}
              error={error}
              onSubmit={
                handleResetPassword
              }
              onBack={() =>
                goTo('VERIFY_RESET')
              }
            />

          )}

        </div>

      </div>

    </div>
  );
}


// ============================================================
// LOGIN SCREEN
// ============================================================

function LoginScreen({
  email,
  setEmail,
  password,
  setPassword,
  loading,
  error,
  success,
  onSubmit,
  onRegister,
  onForgot,
}) {

  return (

    <>

      <div className="text-center mb-6">

        <div
          className="
            mx-auto
            w-11
            h-11
            rounded-xl
            bg-loom-600/10
            text-loom-700
            flex
            items-center
            justify-center
          "
        >
          <LogIn size={20} />
        </div>

        <h2 className="font-display text-xl mt-3">
          Sign in
        </h2>

        <p className="text-xs text-ink-700/50 mt-1">
          Access your WINCREA workspace
        </p>

      </div>


      <form
        onSubmit={onSubmit}
        className="space-y-4"
      >

        <Field label="Gmail">

          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
            placeholder="you@gmail.com"
            autoComplete="email"
            required
          />

        </Field>


        <Field label="Password">

          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />

        </Field>


        {success && (
          <Message
            type="success"
            text={success}
          />
        )}


        {error && (
          <Message
            type="error"
            text={error}
          />
        )}


        <button
          type="submit"
          className="
            btn-primary
            w-full
            justify-center
            gap-2
          "
          disabled={loading}
        >

          <LogIn size={16} />

          {loading
            ? 'Signing in...'
            : 'Sign In'}

        </button>


        <button
          type="button"
          className="
            w-full
            text-xs
            text-loom-700
            hover:text-loom-800
            font-medium
            pt-1
          "
          onClick={onForgot}
        >
          Forgot password?
        </button>

      </form>


      <div className="flex items-center gap-3 my-6">

        <div className="h-px bg-ink-900/8 flex-1" />

        <span className="text-[10px] uppercase tracking-wider text-ink-700/35">
          New to WINCREA?
        </span>

        <div className="h-px bg-ink-900/8 flex-1" />

      </div>


      <button
        type="button"
        className="
          btn-secondary
          w-full
          justify-center
          gap-2
        "
        onClick={onRegister}
      >

        <UserPlus size={15} />

        Create Account

      </button>

    </>
  );
}


// ============================================================
// REGISTER SCREEN
// ============================================================

function RegisterScreen({
  name,
  setName,
  email,
  setEmail,
  loading,
  error,
  onSubmit,
  onBack,
}) {

  return (

    <>

      <ScreenHeader
        icon={<UserPlus size={18} />}
        title="Create account"
        subtitle="Register using your Gmail address."
      />


      <form
        onSubmit={onSubmit}
        className="space-y-4"
      >

        <Field label="Full Name">

          <input
            className="input"
            value={name}
            onChange={(e) =>
              setName(
                e.target.value
              )
            }
            placeholder="Enter your full name"
            autoComplete="name"
            required
          />

        </Field>


        <Field label="Gmail">

          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
            placeholder="you@gmail.com"
            autoComplete="email"
            required
          />

        </Field>


        <div
          className="
            rounded-xl
            border
            border-ink-900/8
            bg-ink-900/[0.02]
            p-3
          "
        >

          <div className="flex items-start gap-2">

            <ShieldCheck
              size={15}
              className="text-loom-700 mt-0.5"
            />

            <p className="text-xs text-ink-700/55 leading-relaxed">
              New accounts are created as
              <strong> Staff</strong> and must be
              approved by an administrator before
              you can sign in.
            </p>

          </div>

        </div>


        {error && (
          <Message
            type="error"
            text={error}
          />
        )}


        <button
          type="submit"
          className="
            btn-primary
            w-full
            justify-center
            gap-2
          "
          disabled={loading}
        >

          <Mail size={16} />

          {loading
            ? 'Sending OTP...'
            : 'Send Verification OTP'}

        </button>


        <BackButton
          onClick={onBack}
        />

      </form>

    </>
  );
}


// ============================================================
// REGISTRATION / OTP SCREEN
// ============================================================

function OtpScreen({
  title,
  subtitle,
  otp,
  setOtp,
  password,
  setPassword,
  passwordConfirm,
  setPasswordConfirm,
  loading,
  error,
  success,
  showPassword,
  onSubmit,
  onBack,
}) {

  return (

    <>

      <ScreenHeader
        icon={<Mail size={18} />}
        title={title}
        subtitle={subtitle}
      />


      <form
        onSubmit={onSubmit}
        className="space-y-4"
      >

        <Field label="6-Digit OTP">

          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="
              input
              text-center
              text-lg
              tracking-[0.45em]
              font-semibold
            "
            value={otp}
            onChange={(e) =>
              setOtp(
                e.target.value
                  .replace(/\D/g, '')
                  .slice(0, 6)
              )
            }
            placeholder="000000"
            required
          />

        </Field>


        {showPassword && (

          <>

            <Field label="Create Password">

              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
                required
              />

            </Field>


            <Field label="Confirm Password">

              <input
                type="password"
                className="input"
                value={passwordConfirm}
                onChange={(e) =>
                  setPasswordConfirm(
                    e.target.value
                  )
                }
                placeholder="Re-enter your password"
                autoComplete="new-password"
                required
              />

            </Field>

          </>

        )}


        {success && (
          <Message
            type="success"
            text={success}
          />
        )}


        {error && (
          <Message
            type="error"
            text={error}
          />
        )}


        <button
          type="submit"
          className="
            btn-primary
            w-full
            justify-center
            gap-2
          "
          disabled={loading}
        >

          <CheckCircle2 size={16} />

          {loading
            ? 'Verifying...'
            : 'Verify & Continue'}

        </button>


        <BackButton
          onClick={onBack}
        />

      </form>

    </>
  );
}


// ============================================================
// FORGOT PASSWORD
// ============================================================

function ForgotPasswordScreen({
  email,
  setEmail,
  loading,
  error,
  success,
  onSubmit,
  onBack,
}) {

  return (

    <>

      <ScreenHeader
        icon={<KeyRound size={18} />}
        title="Reset password"
        subtitle="We'll send a verification OTP to your Gmail."
      />


      <form
        onSubmit={onSubmit}
        className="space-y-4"
      >

        <Field label="Gmail">

          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
            placeholder="you@gmail.com"
            autoComplete="email"
            required
          />

        </Field>


        {success && (
          <Message
            type="success"
            text={success}
          />
        )}


        {error && (
          <Message
            type="error"
            text={error}
          />
        )}


        <button
          type="submit"
          className="
            btn-primary
            w-full
            justify-center
            gap-2
          "
          disabled={loading}
        >

          <Mail size={16} />

          {loading
            ? 'Sending OTP...'
            : 'Send Reset OTP'}

        </button>


        <BackButton
          onClick={onBack}
        />

      </form>

    </>
  );
}


// ============================================================
// OTP ONLY
// ============================================================

function OtpOnlyScreen({
  title,
  subtitle,
  otp,
  setOtp,
  error,
  success,
  onSubmit,
  onBack,
}) {

  return (

    <>

      <ScreenHeader
        icon={<Mail size={18} />}
        title={title}
        subtitle={subtitle}
      />


      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-4"
      >

        <Field label="6-Digit OTP">

          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="
              input
              text-center
              text-lg
              tracking-[0.45em]
              font-semibold
            "
            value={otp}
            onChange={(e) =>
              setOtp(
                e.target.value
                  .replace(/\D/g, '')
                  .slice(0, 6)
              )
            }
            placeholder="000000"
            required
          />

        </Field>


        {success && (
          <Message
            type="success"
            text={success}
          />
        )}


        {error && (
          <Message
            type="error"
            text={error}
          />
        )}


        <button
          type="submit"
          className="
            btn-primary
            w-full
            justify-center
            gap-2
          "
        >

          <CheckCircle2 size={16} />

          Verify OTP

        </button>


        <BackButton
          onClick={onBack}
        />

      </form>

    </>
  );
}


// ============================================================
// RESET PASSWORD
// ============================================================

function ResetPasswordScreen({
  password,
  setPassword,
  passwordConfirm,
  setPasswordConfirm,
  loading,
  error,
  onSubmit,
  onBack,
}) {

  return (

    <>

      <ScreenHeader
        icon={<KeyRound size={18} />}
        title="Create new password"
        subtitle="Choose a strong password for your WINCREA account."
      />


      <form
        onSubmit={onSubmit}
        className="space-y-4"
      >

        <Field label="New Password">

          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            placeholder="Minimum 6 characters"
            autoComplete="new-password"
            required
          />

        </Field>


        <Field label="Confirm Password">

          <input
            type="password"
            className="input"
            value={passwordConfirm}
            onChange={(e) =>
              setPasswordConfirm(
                e.target.value
              )
            }
            placeholder="Re-enter your password"
            autoComplete="new-password"
            required
          />

        </Field>


        {error && (
          <Message
            type="error"
            text={error}
          />
        )}


        <button
          type="submit"
          className="
            btn-primary
            w-full
            justify-center
            gap-2
          "
          disabled={loading}
        >

          <KeyRound size={16} />

          {loading
            ? 'Updating Password...'
            : 'Reset Password'}

        </button>


        <BackButton
          onClick={onBack}
        />

      </form>

    </>
  );
}


// ============================================================
// PENDING
// ============================================================

function PendingScreen({
  email,
  onBack,
}) {

  return (

    <div className="text-center py-4">

      <div
        className="
          mx-auto
          h-14
          w-14
          rounded-2xl
          bg-amber-50
          border
          border-amber-100
          text-amber-600
          flex
          items-center
          justify-center
        "
      >
        <Clock3 size={25} />
      </div>


      <h2 className="font-display text-xl mt-4">
        Waiting for Admin Approval
      </h2>


      <p className="text-sm text-ink-700/55 mt-2 leading-relaxed">
        Your Gmail has been verified successfully.
        Your account is now waiting for an administrator
        to approve your access.
      </p>


      {email && (

        <div
          className="
            mt-4
            rounded-xl
            border
            border-ink-900/8
            bg-ink-900/[0.02]
            px-4
            py-3
            text-sm
            font-medium
          "
        >
          {email}
        </div>

      )}


      <p className="text-xs text-ink-700/40 mt-4">
        You will receive an email when your request is approved or rejected.
      </p>


      <button
        type="button"
        className="
          btn-secondary
          w-full
          justify-center
          gap-2
          mt-6
        "
        onClick={onBack}
      >

        <ArrowLeft size={15} />

        Back to Sign In

      </button>

    </div>
  );
}


// ============================================================
// HEADER
// ============================================================

function ScreenHeader({
  icon,
  title,
  subtitle,
}) {

  return (

    <div className="text-center mb-6">

      <div
        className="
          mx-auto
          w-11
          h-11
          rounded-xl
          bg-loom-600/10
          text-loom-700
          flex
          items-center
          justify-center
        "
      >
        {icon}
      </div>

      <h2 className="font-display text-xl mt-3">
        {title}
      </h2>

      <p className="text-xs text-ink-700/50 mt-1">
        {subtitle}
      </p>

    </div>
  );
}


// ============================================================
// BACK BUTTON
// ============================================================

function BackButton({
  onClick,
}) {

  return (

    <button
      type="button"
      className="
        w-full
        flex
        items-center
        justify-center
        gap-2
        text-xs
        text-ink-700/50
        hover:text-ink-700
        pt-1
      "
      onClick={onClick}
    >

      <ArrowLeft size={13} />

      Back

    </button>
  );
}


// ============================================================
// FIELD
// ============================================================

function Field({
  label,
  children,
}) {

  return (

    <div>

      <label className="label">
        {label}
      </label>

      {children}

    </div>
  );
}


// ============================================================
// MESSAGE
// ============================================================

function Message({
  type,
  text,
}) {

  const isSuccess =
    type === 'success';

  return (

    <div
      className={`
        p-3
        rounded-xl
        text-sm
        border
        ${
          isSuccess
            ? 'bg-signal-good/10 border-signal-good/20 text-signal-good'
            : 'bg-signal-bad/10 border-signal-bad/20 text-signal-bad'
        }
      `}
    >
      {text}
    </div>
  );
}
