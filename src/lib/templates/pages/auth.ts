import type { BuilderNode } from '@/lib/schema';
import { node } from '../helpers';
import type { PageTemplate } from '../types';

/** A narrow column centred on the page: full width on phones, about a third on wide screens. */
const centred = (children: BuilderNode[]) =>
  node('Row', { justify: 'center' }, [
    node('Col', { span: 8, xs: 24, sm: 16, md: 14, lg: 10, xl: 8 }, [
      node('Flex', { vertical: true, gap: 'middle' }, children),
    ]),
  ]);

const field = (label: string, name: string, input: BuilderNode, required = true) =>
  node('Form.Item', { label, name, ...(required && { required: true }) }, [input]);

const brand = (title: string, tagline: string) =>
  node('Flex', { vertical: true, align: 'center', gap: 'small' }, [
    node('Avatar', { children: 'A', shape: 'square', size: 'large' }),
    node('Typography.Title', { children: title, level: 3 }),
    node('Typography.Text', { children: tagline, type: 'secondary' }),
  ]);

export const signIn: PageTemplate = {
  id: 'sign-in',
  label: 'Sign-in page',
  description: 'Centred sign-in card with remember me, a reset link and a social sign-in option.',
  category: 'account',
  preset: 'grape',
  build: () => [
    centred([
      brand('Welcome back', 'Sign in to continue to Acme'),
      node('Card', {}, [
        node('Form', { layout: 'vertical' }, [
          field('Email', 'email', node('Input', { placeholder: 'you@example.com' })),
          field('Password', 'password', node('Input.Password', { placeholder: 'Password' })),
          node('Flex', { justify: 'space-between', align: 'center', wrap: true }, [
            node('Checkbox', { children: 'Remember me' }),
            node('Typography.Link', { children: 'Forgot password?', href: '#' }),
          ]),
          node('Divider'),
          node('Flex', { vertical: true, gap: 'small' }, [
            node('Button', { children: 'Sign in', type: 'primary', block: true }),
            node('Button', { children: 'Continue with Google', type: 'default', block: true }),
          ]),
        ]),
      ]),
      node('Flex', { justify: 'center', gap: 'small' }, [
        node('Typography.Text', { children: 'No account yet?', type: 'secondary' }),
        node('Typography.Link', { children: 'Create one', href: '#' }),
      ]),
    ]),
  ],
};

export const signUp: PageTemplate = {
  id: 'sign-up',
  label: 'Sign-up page',
  description: 'Account creation form with progress steps, team size and terms consent.',
  category: 'account',
  preset: 'grape',
  build: () => [
    centred([
      brand('Create your account', 'Free for 14 days, no card needed'),
      node('Card', {}, [
        node('Flex', { vertical: true, gap: 'large' }, [
          node('Steps', {
            current: 0,
            size: 'small',
            titlePlacement: 'vertical',
            items: [{ title: 'Account' }, { title: 'Workspace' }, { title: 'Team' }],
          }),
          node('Form', { layout: 'vertical' }, [
            field('Full name', 'name', node('Input', { placeholder: 'Ada Lovelace' })),
            field('Work email', 'email', node('Input', { placeholder: 'you@company.com' })),
            field(
              'Password',
              'password',
              node('Input.Password', { placeholder: 'At least 8 characters' }),
            ),
            field(
              'Team size',
              'teamSize',
              node('Select', {
                placeholder: 'How many people?',
                options: [
                  { value: '1', label: 'Just me' },
                  { value: '2-10', label: '2–10' },
                  { value: '11-50', label: '11–50' },
                  { value: '51+', label: 'More than 50' },
                ],
              }),
              false,
            ),
            node('Form.Item', { name: 'terms' }, [
              node('Checkbox', { children: 'I agree to the Terms and Privacy Policy' }),
            ]),
            node('Button', { children: 'Create account', type: 'primary', block: true }),
          ]),
        ]),
      ]),
      node('Flex', { justify: 'center', gap: 'small' }, [
        node('Typography.Text', { children: 'Already have an account?', type: 'secondary' }),
        node('Typography.Link', { children: 'Sign in', href: '#' }),
      ]),
    ]),
  ],
};
