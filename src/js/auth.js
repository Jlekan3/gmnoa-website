// =========================================================
// GMNOA - AUTHENTICATION
// =========================================================
//
// This file handles Supabase Authentication.
//
// CURRENT STAGE:
// - Sign in
// - Sign out
// - Get current session
// - Listen for authentication changes
//
// IMPORTANT:
// The GMNOA database has NOT been created yet.
//
// Therefore this file DOES NOT:
// - Query profiles
// - Check admin roles
// - Query database tables
// - Check RLS policies
//
// We will add those after the database is created.
//
// =========================================================

import { supabase } from "./supabase-client.js";


// =========================================================
// SIGN IN
// =========================================================

export async function signIn(email, password) {

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {

        return {
            success: false,
            error: "Please enter your email address and password."
        };

    }


    const { data, error } =
        await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: password
        });


    if (error) {

        console.error(
            "Supabase login error:",
            error
        );

        return {
            success: false,
            error: getAuthErrorMessage(error)
        };

    }


    return {
        success: true,
        data: data
    };

}


// =========================================================
// SIGN OUT
// =========================================================

export async function signOut() {

    const { error } =
        await supabase.auth.signOut();


    if (error) {

        console.error(
            "Supabase sign-out error:",
            error
        );

        return {
            success: false,
            error: getAuthErrorMessage(error)
        };

    }


    return {
        success: true
    };

}


// =========================================================
// GET CURRENT SESSION
// =========================================================

export async function getSession() {

    const {
        data,
        error
    } = await supabase.auth.getSession();


    if (error) {

        console.error(
            "Session error:",
            error
        );

        return {
            success: false,
            session: null,
            error: getAuthErrorMessage(error)
        };

    }


    return {
        success: true,
        session: data.session
    };

}


// =========================================================
// GET CURRENT USER
// =========================================================

export async function getCurrentUser() {

    const {
        data,
        error
    } = await supabase.auth.getUser();


    if (error) {

        return {
            success: false,
            user: null,
            error: getAuthErrorMessage(error)
        };

    }


    return {
        success: true,
        user: data.user
    };

}


// =========================================================
// AUTH STATE LISTENER
// =========================================================

export function onAuthStateChange(callback) {

    const {
        data
    } = supabase.auth.onAuthStateChange(
        (event, session) => {

            callback(event, session);

        }
    );


    return data.subscription;

}


// =========================================================
// AUTH ERROR HANDLER
// =========================================================

function getAuthErrorMessage(error) {

    if (!error) {
        return "An unknown authentication error occurred.";
    }


    const message =
        error.message || "";


    const lowerMessage =
        message.toLowerCase();


    if (
        lowerMessage.includes("invalid login credentials")
    ) {

        return "Incorrect email or password.";

    }


    if (
        lowerMessage.includes("email not confirmed")
    ) {

        return "Please confirm your email address before signing in.";

    }


    if (
        lowerMessage.includes("too many requests")
    ) {

        return "Too many login attempts. Please try again later.";

    }


    if (
        lowerMessage.includes("network")
    ) {

        return "Unable to connect to Supabase. Check your internet connection.";

    }


    return message ||
        "Unable to sign in. Please try again.";

}


// =========================================================
// EXPORT
// =========================================================

export default {
    signIn,
    signOut,
    getSession,
    getCurrentUser,
    onAuthStateChange
};