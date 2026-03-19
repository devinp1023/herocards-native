import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { FONTS } from '../theme/fonts';
import { STARTING_CREDITS } from '../data/constants';

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
    <KeyboardAvoidingView
      style={s.root}
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
        <View style={s.card}>
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
              <TextInput
                style={s.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Username (shown in game)"
                placeholderTextColor="#606480"
                autoCapitalize="none"
                returnKeyType="next"
              />
            )}
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor="#606480"
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
            />
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              placeholder={mode === 'register' ? 'Password (min 6 chars)' : 'Password'}
              placeholderTextColor="#606480"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handle}
            />
            {!!error && <Text style={s.error}>{error}</Text>}

            <TouchableOpacity
              style={[s.submitBtn, loading && s.submitBtnDisabled]}
              onPress={handle}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#060610" size="small" />
                : <Text style={[s.submitText, { fontFamily: FONTS.orbitronBold }]}>
                    {mode === 'login' ? 'ENTER' : 'CREATE ACCOUNT'}
                  </Text>
              }
            </TouchableOpacity>
          </View>
        </View>

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
  );
}

const s = StyleSheet.create({
  root:             { flex:1, backgroundColor:'#010004' },
  scroll:           { flexGrow:1, alignItems:'center', justifyContent:'center', paddingHorizontal:32, paddingVertical:24 },

  logo:             { width:380, height:240, marginBottom:0, backgroundColor:'#010004' },

  card:             { width:'100%', maxWidth:360, backgroundColor:'#06060f', borderRadius:22, padding:32, borderWidth:1, borderColor:'#16163a' },
  toggle:           { flexDirection:'row', marginBottom:28, borderRadius:12, overflow:'hidden', borderWidth:1, borderColor:'#12122a' },
  toggleBtn:        { flex:1, paddingVertical:12, alignItems:'center', backgroundColor:'transparent' },
  toggleBtnActive:  { backgroundColor:'#4fc3f7' },
  toggleText:       { fontSize:14, color:'#d0d4e8', letterSpacing:1 },
  toggleTextActive: { color:'#060610' },

  inputs:           { gap:14 },
  input:            { backgroundColor:'#0a0a20', borderWidth:1, borderColor:'#1e1e3a', borderRadius:12, paddingHorizontal:16, paddingVertical:14, color:'#e0e4f4', fontSize:16, fontFamily:'monospace' },
  error:            { color:'#ef5350', fontSize:14, fontFamily:'monospace', textAlign:'center', lineHeight:20 },
  submitBtn:        { backgroundColor:'#4fc3f7', borderRadius:12, paddingVertical:18, alignItems:'center', justifyContent:'center', marginTop:6 },
  submitBtnDisabled:{ backgroundColor:'#a0a8c0' },
  submitText:       { fontSize:16, fontWeight:'700', color:'#060610', letterSpacing:2 },

  tagline:          { marginTop:20, fontSize:13, color:'#a0a8c0', fontFamily:'monospace', textAlign:'center' },

  // God Mode
  godSection:       { marginTop:40, width:'100%', maxWidth:360, borderTopWidth:1, borderTopColor:'#0f0f24', paddingTop:24, alignItems:'center', gap:16 },
  godRow:           { flexDirection:'row', alignItems:'center', gap:16 },
  godLabel:         { fontSize:16, color:'#d0d4e8', letterSpacing:2 },
  toggle2:          { width:64, height:34, borderRadius:17, backgroundColor:'#a0a8c0', justifyContent:'center', paddingHorizontal:3 },
  toggle2Active:    { backgroundColor:'#ff9800' },
  toggleKnob:       { width:28, height:28, borderRadius:14, backgroundColor:'#c8ccde' },
  toggleKnobActive: { backgroundColor:'#060610', alignSelf:'flex-end' },
  godState:         { fontSize:16, color:'#d0d4e8', letterSpacing:1 },
  godStateOn:       { color:'#ff9800' },
  enterGodBtn:      { backgroundColor:'#ff6b00', borderRadius:12, paddingVertical:16, paddingHorizontal:40 },
  enterGodText:     { fontSize:16, fontWeight:'700', color:'#060610', letterSpacing:2 },
  godHint:          { fontSize:13, color:'#a0a8c0', fontFamily:'monospace', textAlign:'center', lineHeight:20 },
});
