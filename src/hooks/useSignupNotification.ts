/// <reference types="vite/client" />
import emailjs from '@emailjs/browser';

// Assuming you have a SignupContext that provides the signup state
// import { useSignupContext } from '../contexts/SignupContext';

export interface SignupData {
  userType: 'institution' | 'agent';
  email: string;
  contactName: string;
  institutionName?: string; // If userType === 'institution'
  agencyName?: string; // If userType === 'agent'
  // Add other fields as needed
}

export const useSignupNotification = () => {
  // Extract state from your existing context
  // const { signupState } = useSignupContext();

  const sendNotification = async (signupState: SignupData) => {
    try {
      // 1. Extract and map variables based on user type
      const { userType, email, contactName, institutionName, agencyName } = signupState;
      
      const organizationName = userType === 'institution' 
        ? institutionName 
        : agencyName;

      // 2. Prepare the parameters for the EmailJS template
      const templateParams = {
        to_email: email,
        to_name: contactName,
        user_type: userType, // 'institution' or 'agent'
        organization_name: organizationName || 'Your Organization',
        // Add any other dynamic fields your template requires here
      };

      // 3. Trigger emailjs.send()
      const response = await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        templateParams,
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );

      console.log('Signup notification sent successfully:', response.status, response.text);
      return { success: true, response };
      
    } catch (error) {
      console.error('Failed to send signup notification:', error);
      return { success: false, error };
    }
  };

  return { sendNotification };
};
