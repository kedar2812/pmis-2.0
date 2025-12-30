import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
    Building2, User, Mail, Phone, FileText, MapPin, Landmark,
    ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2,
    Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/api/client';
import Button from '@/components/ui/Button';
import SearchableSelect from '@/components/ui/SearchableSelect';
import IFSCInput from '@/components/contractor/IFSCInput';
import { fetchBankList } from '@/services/ifscService';

// InputField moved OUTSIDE the main component to prevent re-creation on every render
const InputField = ({ label, name, value, onChange, error, type = 'text', required = false, icon: Icon, placeholder, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />}
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full px-4 py-2.5 ${Icon ? 'pl-10' : ''} rounded-xl border transition-all outline-none focus:ring-2 ${error
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                    : 'border-slate-200 focus:border-primary-500 focus:ring-primary-100'
                    }`}
                {...props}
            />
        </div>
        {error && (
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle size={14} /> {error}
            </p>
        )}
    </div>
);

const ContractorRegistration = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [bankList, setBankList] = useState([]);
    const [loadingBanks, setLoadingBanks] = useState(false);

    const [formData, setFormData] = useState({
        // Account
        email: '',
        password: '',
        confirm_password: '',
        // Contact Person
        first_name: '',
        last_name: '',
        phone_number: '',
        designation: '',
        // Company
        company_name: '',
        pan_number: '',
        gstin_number: '',
        eproc_number: '',
        // Address
        building_number: '',
        street: '',
        area: '',
        city: '',
        state: '',
        country: 'India',
        zip_code: '',
        // Bank
        bank_name: '',
        bank_branch: '',
        ifsc_code: '',
        account_number: '',
        account_type: 'CURRENT',
    });

    const [errors, setErrors] = useState({});

    const steps = [
        { id: 1, title: 'Account', icon: User },
        { id: 2, title: 'Company', icon: Building2 },
        { id: 3, title: 'Address', icon: MapPin },
        { id: 4, title: 'Bank', icon: Landmark },
    ];

    // Load bank list on component mount
    useEffect(() => {
        const loadBanks = async () => {
            setLoadingBanks(true);
            try {
                const banks = await fetchBankList();
                setBankList(banks);
            } catch (error) {
                console.error('Failed to load banks:', error);
                toast.error('Failed to load bank list');
            } finally {
                setLoadingBanks(false);
            }
        };
        loadBanks();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateStep = (step) => {
        const newErrors = {};

        if (step === 1) {
            if (!formData.email) newErrors.email = 'Email is required';
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
            if (!formData.password) newErrors.password = 'Password is required';
            else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
            if (formData.password !== formData.confirm_password) newErrors.confirm_password = 'Passwords do not match';
            if (!formData.first_name) newErrors.first_name = 'First name is required';
            if (!formData.last_name) newErrors.last_name = 'Last name is required';
            if (!formData.phone_number) newErrors.phone_number = 'Phone number is required';
        }

        if (step === 2) {
            if (!formData.company_name) newErrors.company_name = 'Company name is required';
            if (!formData.pan_number) newErrors.pan_number = 'PAN is required';
            else if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(formData.pan_number.toUpperCase())) {
                newErrors.pan_number = 'Invalid PAN format (e.g., ABCDE1234F)';
            }
            if (!formData.gstin_number) newErrors.gstin_number = 'GSTIN is required';
            else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(formData.gstin_number.toUpperCase())) {
                newErrors.gstin_number = 'Invalid GSTIN format';
            }
            if (!formData.eproc_number) newErrors.eproc_number = 'e-Procurement Number is required';
        }

        if (step === 3) {
            if (!formData.street) newErrors.street = 'Street is required';
            if (!formData.city) newErrors.city = 'City is required';
            if (!formData.state) newErrors.state = 'State is required';
            if (!formData.zip_code) newErrors.zip_code = 'PIN code is required';
        }

        if (step === 4) {
            if (!formData.bank_name) newErrors.bank_name = 'Bank name is required';
            if (!formData.ifsc_code) newErrors.ifsc_code = 'IFSC code is required';
            else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc_code.toUpperCase())) {
                newErrors.ifsc_code = 'Invalid IFSC format';
            }
            if (!formData.account_number) newErrors.account_number = 'Account number is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => prev - 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateStep(currentStep)) return;

        setIsSubmitting(true);
        try {
            // Convert to uppercase for validation fields
            const submitData = {
                ...formData,
                pan_number: formData.pan_number.toUpperCase(),
                gstin_number: formData.gstin_number.toUpperCase(),
                ifsc_code: formData.ifsc_code.toUpperCase(),
            };

            await api.post('/users/register-contractor/', submitData);
            setIsSuccess(true);
            toast.success('Registration submitted successfully!');
        } catch (error) {
            console.error('Registration failed:', error);
            if (error.response?.data) {
                const serverErrors = error.response.data;
                if (typeof serverErrors === 'object') {
                    // Handle non_field_errors (like password validation)
                    if (serverErrors.non_field_errors) {
                        setErrors({ password: serverErrors.non_field_errors[0] });
                        setCurrentStep(1);
                        toast.error(serverErrors.non_field_errors[0]);
                    } else {
                        setErrors(serverErrors);
                        // Go to the step with errors
                        const errorFields = Object.keys(serverErrors);
                        if (errorFields.some(f => ['email', 'password', 'first_name', 'last_name', 'phone_number', 'confirm_password'].includes(f))) {
                            setCurrentStep(1);
                        } else if (errorFields.some(f => ['company_name', 'pan_number', 'gstin_number', 'eproc_number'].includes(f))) {
                            setCurrentStep(2);
                        } else if (errorFields.some(f => ['street', 'city', 'state', 'zip_code'].includes(f))) {
                            setCurrentStep(3);
                        } else if (errorFields.some(f => ['bank_name', 'ifsc_code', 'account_number', 'account_type'].includes(f))) {
                            setCurrentStep(4);
                        }
                        toast.error('Please fix the errors and try again.');
                    }
                }
            } else {
                toast.error('Registration failed. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center"
                >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-3">Registration Submitted!</h1>
                    <p className="text-slate-600 mb-6">
                        Your registration is pending approval. You will receive an email once your account has been activated.
                    </p>
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
                    >
                        <ArrowLeft size={18} /> Back to Login
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden"
                style={{ boxShadow: '0 0 60px rgba(255, 255, 255, 0.15)' }}
            >
                {/* Header */}
                <div className="bg-primary-600 p-6 text-white rounded-t-3xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Contractor Registration</h1>
                            <p className="text-white/80 text-sm">PMIS - Zaheerabad Industrial Area</p>
                        </div>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center justify-between mt-6">
                        {steps.map((step, index) => (
                            <div key={step.id} className="flex items-center">
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep > step.id ? 'bg-green-500 text-white' :
                                        currentStep === step.id ? 'bg-white text-primary-600' : 'bg-white/30 text-white'
                                        }`}>
                                        {currentStep > step.id ? <CheckCircle2 size={16} /> : step.id}
                                    </div>
                                    <span className={`text-sm font-medium hidden sm:block ${currentStep >= step.id ? 'text-white' : 'text-white/60'
                                        }`}>{step.title}</span>
                                </div>
                                {index < steps.length - 1 && (
                                    <div className={`w-8 sm:w-16 h-0.5 mx-2 ${currentStep > step.id ? 'bg-green-500' : 'bg-white/30'}`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="p-6">
                    {/* Step 1: Account & Contact */}
                    {currentStep === 1 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                            <h2 className="text-lg font-semibold text-slate-900 mb-4">Account & Contact Information</h2>

                            <InputField label="Email" name="email" type="email" required icon={Mail} placeholder="company@example.com" value={formData.email} onChange={handleChange} error={errors.email} />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Password <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className={`w-full px-4 py-2.5 pr-10 rounded-xl border transition-all outline-none focus:ring-2 ${errors.password ? 'border-red-300' : 'border-slate-200 focus:border-primary-500 focus:ring-primary-100'
                                                }`}
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Confirm Password <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            name="confirm_password"
                                            value={formData.confirm_password}
                                            onChange={handleChange}
                                            className={`w-full px-4 py-2.5 pr-10 rounded-xl border transition-all outline-none focus:ring-2 ${errors.confirm_password ? 'border-red-300' : 'border-slate-200 focus:border-primary-500 focus:ring-primary-100'
                                                }`}
                                        />
                                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {errors.confirm_password && <p className="mt-1 text-sm text-red-500">{errors.confirm_password}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="First Name" name="first_name" required icon={User} placeholder="John" value={formData.first_name} onChange={handleChange} error={errors.first_name} />
                                <InputField label="Last Name" name="last_name" required placeholder="Doe" value={formData.last_name} onChange={handleChange} error={errors.last_name} />
                            </div>

                            <div className="space-y-1">
                                <InputField label="Phone Number" name="phone_number" required icon={Phone} placeholder="9876543210" value={formData.phone_number} onChange={handleChange} error={errors.phone_number} />
                                {formData.first_name && (
                                    <p className="text-sm text-green-600 font-medium px-1">
                                        Username: epc_contractor_{formData.first_name.toLowerCase().replace(/[^a-z0-9]/g, '')}_{formData.last_name ? formData.last_name.toLowerCase().replace(/[^a-z0-9]/g, '').charAt(0) : 'x'}
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Step 2: Company Details */}
                    {currentStep === 2 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                            <h2 className="text-lg font-semibold text-slate-900 mb-4">Company & Legal Details</h2>

                            <InputField label="Company Name" name="company_name" required icon={Building2} placeholder="ABC Infrastructure Pvt. Ltd." value={formData.company_name} onChange={handleChange} error={errors.company_name} />

                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="PAN Number" name="pan_number" required icon={FileText} placeholder="ABCDE1234F" value={formData.pan_number} onChange={handleChange} error={errors.pan_number} />
                                <InputField label="GSTIN Number" name="gstin_number" required placeholder="22AAAAA0000A1Z5" value={formData.gstin_number} onChange={handleChange} error={errors.gstin_number} />
                            </div>

                            <InputField label="e-Procurement Number" name="eproc_number" required placeholder="EPROC-2024-XXXX" value={formData.eproc_number} onChange={handleChange} error={errors.eproc_number} />
                        </motion.div>
                    )}

                    {/* Step 3: Address */}
                    {currentStep === 3 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                            <h2 className="text-lg font-semibold text-slate-900 mb-4">Registered Address</h2>

                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="Building/Office No." name="building_number" placeholder="123-A" value={formData.building_number} onChange={handleChange} error={errors.building_number} />
                                <InputField label="Street" name="street" required placeholder="Main Road" value={formData.street} onChange={handleChange} error={errors.street} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="Area/Locality" name="area" placeholder="Industrial Estate" value={formData.area} onChange={handleChange} error={errors.area} />
                                <InputField label="City" name="city" required placeholder="Hyderabad" value={formData.city} onChange={handleChange} error={errors.city} />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <InputField label="State" name="state" required placeholder="Telangana" value={formData.state} onChange={handleChange} error={errors.state} />
                                <InputField label="Country" name="country" placeholder="India" value={formData.country} onChange={handleChange} error={errors.country} />
                                <InputField label="PIN Code" name="zip_code" required placeholder="500001" value={formData.zip_code} onChange={handleChange} error={errors.zip_code} />
                            </div>
                        </motion.div>
                    )}

                    {/* Step 4: Bank Details */}
                    {currentStep === 4 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                            <h2 className="text-lg font-semibold text-slate-900 mb-4">Bank Account Details</h2>
                            <p className="text-sm text-slate-500 mb-4">Required for bill payments and financial transactions.</p>

                            <SearchableSelect
                                options={bankList}
                                value={formData.bank_name}
                                onChange={(value) => {
                                    setFormData(prev => ({ ...prev, bank_name: value }));
                                    if (errors.bank_name) setErrors(prev => ({ ...prev, bank_name: '' }));
                                }}
                                label="Bank Name"
                                placeholder="Search bank..."
                                required
                                error={errors.bank_name}
                            />

                            <IFSCInput
                                value={formData.ifsc_code}
                                onChange={(value) => {
                                    setFormData(prev => ({ ...prev, ifsc_code: value }));
                                    if (errors.ifsc_code) setErrors(prev => ({ ...prev, ifsc_code: '' }));
                                }}
                                onBranchDataFetched={(branchData) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        bank_name: branchData.bank_name,
                                        bank_branch: branchData.branch_name
                                    }));
                                }}
                                error={errors.ifsc_code}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <InputField
                                    label="Branch"
                                    name="bank_branch"
                                    placeholder="Auto-filled from IFSC"
                                    value={formData.bank_branch}
                                    onChange={handleChange}
                                    error={errors.bank_branch}
                                    disabled={formData.bank_branch && formData.ifsc_code}
                                />
                                <InputField
                                    label="Account Number"
                                    name="account_number"
                                    required
                                    placeholder="1234567890123456"
                                    value={formData.account_number}
                                    onChange={handleChange}
                                    error={errors.account_number}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Account Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="account_type"
                                    value={formData.account_type}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                                >
                                    <option value="CURRENT">Current Account</option>
                                    <option value="SAVINGS">Savings Account</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                        </motion.div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
                        <div>
                            {currentStep > 1 ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleBack}
                                >
                                    <ArrowLeft size={18} /> Back
                                </Button>
                            ) : (
                                <Link to="/login">
                                    <Button variant="outline" type="button">
                                        <ArrowLeft size={18} /> Back to Login
                                    </Button>
                                </Link>
                            )}
                        </div>

                        <div>
                            {currentStep < 4 ? (
                                <Button
                                    type="button"
                                    onClick={handleNext}
                                >
                                    Next <ArrowRight size={18} />
                                </Button>
                            ) : (
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" /> Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={18} /> Submit Registration
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default ContractorRegistration;
