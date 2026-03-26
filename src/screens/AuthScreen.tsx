import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing,
} from 'react-native-reanimated';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { FONTS } from '../theme/fonts';
import { T } from '../theme/theme';
import { STARTING_CREDITS } from '../data/constants';
import { MaterialSurface } from '../components/MaterialSurface';
import { ScreenBackground } from '../components/ScreenBackground';
import { GradientBorder, BORDER_COLORS } from '../components/GradientBorder';
import LightningStrike from '../components/LightningStrike';
import { useRipple } from '../hooks/useRipple';

type Mode = 'login' | 'register';

interface Props {
  onLogin: (uid: string, username: string) => void;
  godMode: boolean;
  onToggleGodMode: () => void;
  onEnterGodMode: () => void;
}

const ERROR_MAP: Record<string, string> = {
  'auth/email-already-in-use': 'Email already registered.',
  'auth/invalid-email':        'Invalid email address.',
  'auth/weak-password':        'Password must be at least 6 characters.',
  'auth/user-not-found':       'No account found with that email.',
  'auth/wrong-password':       'Incorrect password.',
  'auth/invalid-credential':   'Incorrect email or password.',
  'auth/too-many-requests':    'Too many attempts. Try again later.',
  'auth/network-request-failed':'Network error. Check your connection.',
};

export default function AuthScreen({ onLogin, godMode, onToggleGodMode, onEnterGodMode }: Props) {
  const [mode, setMode]         = useState<Mode>('login');
  const [email, setEmail]       = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Breathing shimmer for submit button
  const shimmer = useSharedValue(0);
  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ), -1, false,
    );
  }, []);
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value * 0.12,
  }));

  const submitRipple = useRipple({ rippleColor: 'rgba(0,0,0,0.25)' });

  const friendlyError = (code: string) => ERROR_MAP[code] ?? 'Something went wrong. Try again.';

  const switchMode = (m: Mode) => { setMode(m); setError(''); };

  const handle = async () => {
    if (!email)    { setError('Enter your email.'); return; }
    if (!password) { setError('Enter your password.'); return; }
    if (mode === 'register' && !username.trim()) { setError('Enter a username.'); return; }
    if (mode === 'register' && username.trim().length < 3) { setError('Username must be 3+ characters.'); return; }

    setLoading(true);
    setError('');

    try {
      if (mode === 'register') {
        // Check username availability
        const unameSnap = await getDoc(doc(db, 'usernames', username.trim().toLowerCase()));
        if (unameSnap.exists()) { setError('Username already taken.'); setLoading(false); return; }

        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'usernames', username.trim().toLowerCase()), { uid: cred.user.uid });
        await setDoc(doc(db, 'users', cred.user.uid), {
          username:   username.trim(),
          coins:      STARTING_CREDITS,
          collection: [],
          questDate:  '',
          createdAt:  serverTimestamp(),
        });
        onLogin(cred.user.uid, username.trim());
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const snap = await getDoc(doc(db, 'users', cred.user.uid));
        const data = snap.data() as { username: string };
        onLogin(cred.user.uid, data.username);
      }
    } catch (e: any) {
      setError(friendlyError(e.code));
      setLoading(false);
    }
  };

  return (
    <ScreenBackground theme="neutral">
    <LightningStrike />
    <KeyboardAvoidingView
      style={s.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <Image
          source={require('../../assets/logo.png')}
          style={s.logo}
          resizeMode="contain"
        />

        {/* Card */}
        <MaterialSurface style={s.card} borderRadius={22}>
          {/* Mode toggle */}
          <View style={s.toggle}>
            {(['login', 'register'] as Mode[]).map(m => (
              <TouchableOpacity
                key={m}
                onPress={() => switchMode(m)}
                style={[s.toggleBtn, mode === m && s.toggleBtnActive]}
              >
                <Text style={[s.toggleText, { fontFamily: FONTS.orbitronBold }, mode === m && s.toggleTextActive]}>
                  {m === 'login' ? 'SIGN IN' : 'REGISTER'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Inputs */}
          <View style={s.inputs}>
            {mode === 'register' && (
              focusedField === 'username' ? (
                <GradientBorder colors={BORDER_COLORS.mint} borderWidth={1} borderRadius={12} innerBackground={T.bg.surface}>
                  <TextInput
                    style={[s.input, { borderWidth: 0 }]}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Username (shown in game)"
                    placeholderTextColor={T.text.muted}
                    autoCapitalize="none"
                    returnKeyType="next"
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                  />
                </GradientBorder>
              ) : (
                <TextInput
                  style={s.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Username (shown in game)"
                  placeholderTextColor={T.text.muted}
                  autoCapitalize="none"
                  returnKeyType="next"
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                />
              )
            )}
            {focusedField === 'email' ? (
              <GradientBorder colors={BORDER_COLORS.mint} borderWidth={1} borderRadius={12} innerBackground={T.bg.surface}>
                <TextInput
                  style={[s.input, { borderWidth: 0 }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email address"
                  placeholderTextColor={T.text.muted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </GradientBorder>
            ) : (
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor={T.text.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            )}
            {focusedField === 'password' ? (
              <GradientBorder colors={BORDER_COLORS.mint} borderWidth={1} borderRadius={12} innerBackground={T.bg.surface}>
                <TextInput
                  style={[s.input, { borderWidth: 0 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={mode === 'register' ? 'Password (min 6 chars)' : 'Password'}
                  placeholderTextColor={T.text.muted}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handle}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
              </GradientBorder>
            ) : (
              <TextInput
                style={s.input}
                value={password}
                onChangeText={setPassword}
                placeholder={mode === 'register' ? 'Password (min 6 chars)' : 'Password'}
                placeholderTextColor={T.text.muted}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handle}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
            )}
            {!!error && <Text style={s.error}>{error}</Text>}

            {loading ? (
              <TouchableOpacity
                style={[s.submitBtn, s.submitBtnDisabled]}
                onPress={handle}
                disabled
                activeOpacity={0.85}
              >
                <ActivityIndicator color={T.bg.root} size="small" />
              </TouchableOpacity>
            ) : (
              <Animated.View style={[{ borderRadius: T.button.primary.radius }, submitRipple.pressStyle]}>
                <TouchableOpacity
                  style={[s.submitBtn, { overflow: 'hidden' }]}
                  onPress={handle}
                  activeOpacity={1}
                  onPressIn={submitRipple.onPressIn}
                  onPressOut={submitRipple.onPressOut}
                >
                  <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', borderRadius: T.button.primary.radius }, shimmerStyle]} pointerEvents="none" />
                  <Text style={[s.submitText, { fontFamily: FONTS.orbitronBold }]}>
                    {mode === 'login' ? 'ENTER' : 'CREATE ACCOUNT'}
                  </Text>
                  {submitRipple.rippleView}
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </MaterialSurface>

        <Text style={s.tagline}>Syncs across all your devices · Secured by Firebase</Text>

        {/* God Mode */}
        <View style={s.godSection}>
          <View style={s.godRow}>
            <Text style={[s.godLabel, { fontFamily: FONTS.orbitronBold }]}>GOD MODE</Text>
            <TouchableOpacity onPress={onToggleGodMode} style={[s.toggle2, godMode && s.toggle2Active]} activeOpacity={0.8}>
              <View style={[s.toggleKnob, godMode && s.toggleKnobActive]} />
            </TouchableOpacity>
            <Text style={[s.godState, { fontFamily: FONTS.orbitronBold }, godMode && s.godStateOn]}>
              {godMode ? 'ON' : 'OFF'}
            </Text>
          </View>

          {godMode && (
            <TouchableOpacity style={s.enterGodBtn} onPress={onEnterGodMode} activeOpacity={0.85}>
              <Text style={[s.enterGodText, { fontFamily: FONTS.orbitronBold }]}>⚡ ENTER AS GOD</Text>
            </TouchableOpacity>
          )}
          <Text style={s.godHint}>
            {godMode
              ? 'All 200 cards unlocked · 99999 credits\nNo login required · Nothing is saved'
              : 'Enable to test without logging in'}
          </Text>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  kav:              { flex:1 },
  scroll:           { flexGrow:1, alignItems:'center', justifyContent:'center', paddingHorizontal:32, paddingVertical:24 },

  logo:             { width:380, height:240, marginBottom:0, backgroundColor:T.bg.root },

  card:             { width:'100%', maxWidth:360, borderRadius:22, padding:32 },
  toggle:           { flexDirection:'row', marginBottom:28, borderRadius:12, overflow:'hidden', borderWidth:1, borderColor:T.bg.elevated },
  toggleBtn:        { flex:1, paddingVertical:12, alignItems:'center', backgroundColor:'transparent' },
  toggleBtnActive:  { backgroundColor:T.accent.mint },
  toggleText:       { fontSize:T.font.lg, color:'#d0d4e8', letterSpacing:T.letterSpacing.md },
  toggleTextActive: { color:T.bg.root },

  inputs:           { gap:14 },
  input:            { backgroundColor:T.bg.surface, borderWidth:1, borderColor:T.bg.border, borderRadius:12, paddingHorizontal:16, paddingVertical:14, color:T.text.body, fontSize:T.font.lg, fontFamily:'monospace' },
  error:            { color:T.status.danger, fontSize:T.font.lg, fontFamily:'monospace', textAlign:'center', lineHeight:20 },
  submitBtn:        { backgroundColor:T.accent.mint, borderRadius:T.button.primary.radius, paddingVertical:T.button.primary.paddingV, alignItems:'center', justifyContent:'center', marginTop:6, transform:[{ skewX:'-3deg' }] },
  submitBtnDisabled:{ backgroundColor:'#a0a8c0' },
  submitText:       { fontSize:T.button.primary.fontSize, fontWeight:'700', color:T.button.primary.text, letterSpacing:T.button.primary.letterSpacing, transform:[{ skewX:'3deg' }] },

  tagline:          { marginTop:20, fontSize:T.font.md, color:'#a0a8c0', fontFamily:'monospace', textAlign:'center' },

  // God Mode
  godSection:       { marginTop:40, width:'100%', maxWidth:360, borderTopWidth:1, borderTopColor:T.bg.elevated, paddingTop:24, alignItems:'center', gap:16 },
  godRow:           { flexDirection:'row', alignItems:'center', gap:16 },
  godLabel:         { fontSize:T.font.lg, color:'#d0d4e8', letterSpacing:T.letterSpacing.lg },
  toggle2:          { width:64, height:34, borderRadius:17, backgroundColor:'#a0a8c0', justifyContent:'center', paddingHorizontal:3 },
  toggle2Active:    { backgroundColor:T.status.caution },
  toggleKnob:       { width:28, height:28, borderRadius:14, backgroundColor:T.text.body },
  toggleKnobActive: { backgroundColor:T.bg.root, alignSelf:'flex-end' },
  godState:         { fontSize:T.font.lg, color:'#d0d4e8', letterSpacing:T.letterSpacing.md },
  godStateOn:       { color:T.status.caution },
  enterGodBtn:      { backgroundColor:T.domain.godMode, borderRadius:12, paddingVertical:16, paddingHorizontal:40 },
  enterGodText:     { fontSize:T.font.lg, fontWeight:'700', color:T.bg.root, letterSpacing:T.letterSpacing.lg },
  godHint:          { fontSize:T.font.md, color:'#a0a8c0', fontFamily:'monospace', textAlign:'center', lineHeight:20 },
});
