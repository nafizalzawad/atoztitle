import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertCircle, ArrowLeft, ArrowRight, Check, Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Source = 'event' | 'referral' | 'direct_client' | 'non_direct_client' | 'social_media' | 'other';
type SocialChannel = 'linkedin' | 'facebook' | 'instagram' | 'other';
type Profession = 'agent' | 'lender' | 'attorney' | 'builder' | 'other';

const steps = ['Source', 'Information', 'Intent'];

export default function NewContact() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1: Source
  const [source, setSource] = useState<Source | ''>('');
  const [referralBy, setReferralBy] = useState('');
  const [socialChannel, setSocialChannel] = useState<SocialChannel | ''>('');
  const [sourceOther, setSourceOther] = useState('');

  // Step 2: Contact Info
  const [profession, setProfession] = useState<Profession | ''>('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [parentCompany, setParentCompany] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);

  // Step 3: Intent
  const [intent, setIntent] = useState('');

  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};
    if (s === 0) {
      if (!source) errs.source = 'Please select a source';
      if (source === 'referral' && !referralBy.trim()) errs.referralBy = 'Please enter who referred this contact';
      if (source === 'social_media' && !socialChannel) errs.socialChannel = 'Please select a channel';
    }
    if (s === 1) {
      if (!firstName.trim()) errs.firstName = 'First name is required';
      if (!lastName.trim()) errs.lastName = 'Last name is required';
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email';
      if (phone && !/^[\d\s\-\+\(\)]+$/.test(phone)) errs.phone = 'Invalid phone number';
    }
    if (s === 2) {
      if (intent.trim().length < 10) errs.intent = 'Please provide at least 10 characters explaining your intent';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) setStep(step + 1);
  };

  const handleSave = async () => {
    if (!validateStep(2) || !user) return;
    setSaving(true);

    let screenshotUrl = '';
    if (screenshot) {
      const ext = screenshot.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('screenshots')
        .upload(path, screenshot);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('screenshots').getPublicUrl(path);
        screenshotUrl = urlData.publicUrl;
      }
    }

    // Check duplicates
    if (email || phone) {
      let query = supabase.from('contacts').select('id, first_name, last_name').eq('is_deleted', false);
      if (email) query = query.eq('email', email);
      if (phone) query = query.eq('phone', phone);
      const { data: dupes } = await query;
      if (dupes && dupes.length > 0) {
        const confirmed = window.confirm(
          `A contact with similar info already exists (${dupes[0].first_name} ${dupes[0].last_name}). Continue anyway?`
        );
        if (!confirmed) { setSaving(false); return; }
      }
    }

    const { error } = await supabase.from('contacts').insert({
      bd_user_id: user.id,
      source: source as Source,
      referral_by: source === 'referral' ? referralBy : null,
      social_channel: source === 'social_media' ? (socialChannel as SocialChannel) : null,
      source_other: source === 'other' ? sourceOther : null,
      profession: profession || null,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone || null,
      email: email || null,
      company: company || null,
      parent_company: parentCompany || null,
      screenshot_url: screenshotUrl || null,
      intent: intent.trim(),
    });

    setSaving(false);
    if (error) {
      toast.error('Failed to create contact: ' + error.message);
    } else {
      toast.success('Contact created successfully!');
      navigate('/contacts');
    }
  };

  return (
    <AppLayout title="Add New Contact" subtitle="Complete all steps to add a contact to your pipeline">
      {/* Stepper */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors',
                i < step
                  ? 'bg-success text-success-foreground'
                  : i === step
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn('text-sm font-medium', i === step ? 'text-foreground' : 'text-muted-foreground')}>
              {s}
            </span>
            {i < steps.length - 1 && (
              <div className={cn('h-px w-12', i < step ? 'bg-success' : 'bg-border')} />
            )}
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-8 shadow-card animate-fade-in">
        {/* Step 1: Source */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Source of Client</h3>
              <p className="text-sm text-muted-foreground">How did you find this contact?</p>
            </div>
            <RadioGroup value={source} onValueChange={(v) => setSource(v as Source)}>
              {[
                { value: 'event', label: 'Met at an Event' },
                { value: 'referral', label: 'Referral' },
                { value: 'direct_client', label: 'Direct Client (DC)' },
                { value: 'non_direct_client', label: 'Non-Direct Client (Non-DC)' },
                { value: 'social_media', label: 'Social Media' },
                { value: 'other', label: 'Other' },
              ].map((opt) => (
                <div key={opt.value} className="flex items-center space-x-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={opt.value} id={opt.value} />
                  <Label htmlFor={opt.value} className="cursor-pointer flex-1">{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
            {errors.source && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.source}</p>}

            {source === 'referral' && (
              <div className="space-y-2">
                <Label>Referred By *</Label>
                <Input value={referralBy} onChange={(e) => setReferralBy(e.target.value)} placeholder="Who referred this contact?" />
                {errors.referralBy && <p className="text-sm text-destructive">{errors.referralBy}</p>}
              </div>
            )}

            {source === 'social_media' && (
              <div className="space-y-2">
                <Label>Channel *</Label>
                <Select value={socialChannel} onValueChange={(v) => setSocialChannel(v as SocialChannel)}>
                  <SelectTrigger><SelectValue placeholder="Select channel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.socialChannel && <p className="text-sm text-destructive">{errors.socialChannel}</p>}
              </div>
            )}

            {source === 'other' && (
              <div className="space-y-2">
                <Label>Please specify</Label>
                <Input value={sourceOther} onChange={(e) => setSourceOther(e.target.value)} placeholder="How did you find this contact?" />
              </div>
            )}
          </div>
        )}

        {/* Step 2: Information */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Contact Information</h3>
              <p className="text-sm text-muted-foreground">Enter the contact's details or upload a screenshot</p>
            </div>

            {/* Screenshot Upload */}
            <div className="space-y-2">
              <Label>Screenshot (optional)</Label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-sm text-muted-foreground hover:border-primary/50 hover:bg-muted/30 transition-colors">
                <Upload className="h-4 w-4" />
                {screenshot ? screenshot.name : 'Click to upload a screenshot (JPG/PNG)'}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            <div className="space-y-2">
              <Label>Profession</Label>
              <Select value={profession} onValueChange={(v) => setProfession(v as Profession)}>
                <SelectTrigger><SelectValue placeholder="Select profession" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="lender">Lender</SelectItem>
                  <SelectItem value="attorney">Attorney</SelectItem>
                  <SelectItem value="builder">Builder</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555" />
                {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company</Label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Parent Company</Label>
                <Input value={parentCompany} onChange={(e) => setParentCompany(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Intent */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Intent Declaration</h3>
              <p className="text-sm text-muted-foreground">Why are you adding this contact as a Lead?</p>
            </div>
            <div className="space-y-2">
              <Textarea
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                placeholder="Explain why you're adding this contact and what you hope to achieve..."
                rows={5}
              />
              <div className="flex justify-between">
                {errors.intent && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.intent}</p>}
                <p className={cn('text-xs ml-auto', intent.length < 10 ? 'text-muted-foreground' : 'text-success')}>
                  {intent.length}/10 min
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate('/contacts')}>Cancel</Button>
          )}

          {step < 2 ? (
            <Button onClick={nextStep}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Create Contact
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
