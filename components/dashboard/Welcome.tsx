import React, { useState, FormEvent } from 'react';
import { ClientProfile, User } from '../../types';
import { saveClientProfile } from '../../services/vcpaService';
import Spinner from '../ui/Spinner';

interface WelcomeProps {
    onProfileSave: () => void;
    currentUser: User;
}

const Welcome: React.FC<WelcomeProps> = ({ onProfileSave, currentUser }) => {
    const [profile, setProfile] = useState<ClientProfile>({
        industry: currentUser.clientProfile?.industry || 'Technology / SaaS',
        businessModel: currentUser.clientProfile?.businessModel || 'B2B',
        primaryGoal: currentUser.clientProfile?.primaryGoal || 'Aggressive Growth',
    });
    const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(currentUser.companyLogoUrl || null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            await saveClientProfile(profile, companyLogoUrl);
            onProfileSave();
        } catch(err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({...prev, [name]: value}));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCompanyLogoUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const industries = [
        'Technology / SaaS', 'Retail / E-commerce', 'Professional Services', 
        'Healthcare', 'Construction & Real Estate', 'Hospitality', 'Manufacturing', 'Other'
    ];

    return (
        <div className="text-center bg-white p-8 sm:p-12 rounded-lg shadow-lg animate-fade-in border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 2V8H20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-primary mb-2">Welcome! Let's Personalize Your Dashboard</h2>
            <p className="text-base sm:text-lg text-gray-600 mb-8 max-w-3xl mx-auto">
                Tell us a bit about your business. This context helps our AI provide more tailored and insightful analysis.
            </p>
            
            <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-6 text-left">
                <div>
                    <label htmlFor="industry" className="block text-sm font-medium text-gray-700">Industry</label>
                    <select id="industry" name="industry" value={profile.industry} onChange={handleInputChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm rounded-md">
                        {industries.map(ind => <option key={ind}>{ind}</option>)}
                    </select>
                </div>

                <div>
                    <label htmlFor="businessModel" className="block text-sm font-medium text-gray-700">Business Model</label>
                    <select id="businessModel" name="businessModel" value={profile.businessModel} onChange={handleInputChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm rounded-md">
                        <option>B2B</option>
                        <option>B2C</option>
                        <option>D2C</option>
                        <option>Hybrid</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="primaryGoal" className="block text-sm font-medium text-gray-700">Primary Business Goal</label>
                    <select id="primaryGoal" name="primaryGoal" value={profile.primaryGoal} onChange={handleInputChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm rounded-md">
                        <option>Aggressive Growth</option>
                        <option>Maximize Profitability</option>
                        <option>Maintain Stability</option>
                    </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Company Logo (Optional)</label>
                  <div className="mt-1 flex items-center space-x-4">
                    <div className="flex-shrink-0 h-16 w-16 rounded-md bg-slate-100 flex items-center justify-center overflow-hidden">
                      {companyLogoUrl ? (
                        <img src={companyLogoUrl} alt="Logo Preview" className="h-full w-full object-contain" />
                      ) : (
                         <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                         </svg>
                      )}
                    </div>
                    <label htmlFor="logo-upload" className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary">
                        <span>Upload Logo</span>
                        <input id="logo-upload" name="logo-upload" type="file" className="sr-only" onChange={handleLogoChange} accept="image/png, image/jpeg, image/svg+xml" />
                    </label>
                  </div>
                </div>

                {error && <p className="text-xs text-center text-red-600">{error}</p>}

                <div className="text-center pt-4">
                     <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full md:w-auto inline-flex items-center justify-center px-10 py-4 border border-transparent text-lg font-medium rounded-full shadow-sm text-white bg-accent hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-all transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Spinner size="sm" /> : "Save & Continue to Upload"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Welcome;
