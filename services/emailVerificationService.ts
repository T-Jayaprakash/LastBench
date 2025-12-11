/**
 * Email Verification Service
 * 
 * Handles college email domain validation similar to UNIDAYS.
 * Only allows users with verified college email addresses to create accounts.
 */

import { supabase } from './supabaseClient';

/**
 * List of allowed college email domains
 * Add your college domains here
 * 
 * Format: 'college.edu' or 'student.college.edu'
 */
const ALLOWED_COLLEGE_DOMAINS: string[] = [
    // Your College
    'krce.ac.in',       // K. Ramakrishnan College of Engineering

    // Indian Educational Institutions
    'student.tce.edu',
    'iitm.ac.in',       // IIT Madras
    'iitb.ac.in',       // IIT Bombay
    'iitd.ac.in',       // IIT Delhi
    'iitkgp.ac.in',     // IIT Kharagpur
    'iitk.ac.in',       // IIT Kanpur
    'iitr.ac.in',       // IIT Roorkee
    'iitg.ac.in',       // IIT Guwahati
    'iith.ac.in',       // IIT Hyderabad
    'bits-pilani.ac.in',// BITS Pilani
    'nitk.edu.in',      // NIT Karnataka
    'nitt.edu',         // NIT Trichy
    'nitw.ac.in',       // NIT Warangal
    'annauniv.edu',     // Anna University
    'vit.ac.in',        // VIT
    'manipal.edu',      // Manipal University
    'srmist.edu.in',    // SRM University

    // Add more as needed
    // Example format:
    // 'student.college.edu',
    // 'mail.college.ac.in',
];

/**
 * College domain to college name mapping
 * This helps auto-populate the college field during onboarding
 */
export const DOMAIN_TO_COLLEGE_MAP: { [domain: string]: string } = {
    // Your College
    'krce.ac.in': 'KRCE',

    // Indian Institutions
    'student.tce.edu': 'Thiyagarajar College of Engineering',
    'iitm.ac.in': 'IIT Madras',
    'iitb.ac.in': 'IIT Bombay',
    'iitd.ac.in': 'IIT Delhi',
    'iitkgp.ac.in': 'IIT Kharagpur',
    'iitk.ac.in': 'IIT Kanpur',
    'iitr.ac.in': 'IIT Roorkee',
    'iitg.ac.in': 'IIT Guwahati',
    'iith.ac.in': 'IIT Hyderabad',
    'bits-pilani.ac.in': 'BITS Pilani',
    'nitk.edu.in': 'NIT Karnataka',
    'nitt.edu': 'NIT Trichy',
    'nitw.ac.in': 'NIT Warangal',
    'annauniv.edu': 'Anna University',
    'vit.ac.in': 'VIT',
    'manipal.edu': 'Manipal University',
    'srmist.edu.in': 'SRM University',
};

/**
 * Extract domain from email address
 */
export const extractDomain = (email: string): string | null => {
    const match = email.toLowerCase().match(/@(.+)$/);
    return match ? match[1] : null;
};

/**
 * Check if email domain is from an allowed college
 */
export const isCollegeEmail = (email: string): boolean => {
    const domain = extractDomain(email);
    if (!domain) return false;

    // Check if domain is in allowed list
    if (ALLOWED_COLLEGE_DOMAINS.includes(domain)) {
        return true;
    }

    // Check if subdomain matches (e.g., student.college.edu matches college.edu)
    return ALLOWED_COLLEGE_DOMAINS.some(allowedDomain => {
        return domain.endsWith('.' + allowedDomain) || domain === allowedDomain;
    });
};

/**
 * Get college name from email domain
 */
export const getCollegeFromEmail = (email: string): string | null => {
    const domain = extractDomain(email);
    if (!domain) return null;

    // Direct match
    if (DOMAIN_TO_COLLEGE_MAP[domain]) {
        return DOMAIN_TO_COLLEGE_MAP[domain];
    }

    // Check subdomain matches
    for (const [allowedDomain, collegeName] of Object.entries(DOMAIN_TO_COLLEGE_MAP)) {
        if (domain.endsWith('.' + allowedDomain) || domain === allowedDomain) {
            return collegeName;
        }
    }

    return null;
};

/**
 * Validate email format
 */
export const isValidEmailFormat = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Get user-friendly error message for email validation
 */
export const getEmailValidationError = (email: string): string | null => {
    if (!email.trim()) {
        return 'Email is required';
    }

    if (!isValidEmailFormat(email)) {
        return 'Please enter a valid email address';
    }

    if (!isCollegeEmail(email)) {
        const domain = extractDomain(email);
        return `Sorry, ${domain} is not a recognized college email domain. Please use your college-provided email address.`;
    }

    return null;
};

/**
 * Check if email is already verified in the database
 * This can be used to implement a verified_emails table later
 */
export const isEmailVerified = async (email: string): Promise<boolean> => {
    try {
        // Check if user with this email exists and is verified
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email_verified')
            .eq('user_id', email)
            .single();

        if (error || !data) return false;

        return data.email_verified === true;
    } catch (e) {
        console.error('Error checking email verification:', e);
        return false;
    }
};

/**
 * Get list of all allowed college domains (for admin purposes)
 */
export const getAllowedDomains = (): string[] => {
    return [...ALLOWED_COLLEGE_DOMAINS];
};

/**
 * Add a new college domain dynamically (for future admin panel)
 * This would require database integration
 */
export const addCollegeDomain = async (domain: string, collegeName: string): Promise<boolean> => {
    try {
        // In future, store this in a `allowed_domains` table in Supabase
        // For now, domains are hardcoded above
        console.log(`Request to add domain: ${domain} for ${collegeName}`);
        return true;
    } catch (e) {
        console.error('Error adding college domain:', e);
        return false;
    }
};
