import 'server-only';
import { generateDummyPassword } from '../db/utils';

// Server-only constants
export const DUMMY_PASSWORD = generateDummyPassword();
