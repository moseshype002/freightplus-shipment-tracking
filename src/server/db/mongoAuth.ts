import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
UserModel,
AdminConfigModel,
} from './models.js';

export interface MongoAuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'client';
  company?: string;
  phone?: string;
  createdAt: string;
  passwordHash?: string;
  emailVerified?: boolean;
}

export interface CreateMongoCustomerInput {
name: string;
email: string;
password: string;
company?: string;
phone?: string;
}

export interface CreateMongoAdminInput {
name: string;
email: string;
password: string;
setupSecret: string;
}

function toPublicUser(user: any): Omit<MongoAuthUser, 'passwordHash'> {
return {
id: user.id,
name: user.name,
email: user.email,
role: user.role,
...(user.company ? { company: user.company } : {}),
...(user.phone ? { phone: user.phone } : {}),
createdAt: user.createdAt,
};
}

export const MongoAuth = {
async findUserByEmail(email: string): Promise<MongoAuthUser | undefined> {
const cleanEmail = email.trim().toLowerCase();

const user = await UserModel.findOne({ email: cleanEmail })
  .select('+passwordHash')
  .lean()
  .exec();

return user ? (user as MongoAuthUser) : undefined;

},

async findUserById(id: string): Promise<MongoAuthUser | undefined> {
const user = await UserModel.findOne({ id })
.select('+passwordHash')
.lean()
.exec();

return user ? (user as MongoAuthUser) : undefined;

},

async createCustomer(
data: CreateMongoCustomerInput
): Promise<Omit<MongoAuthUser, 'passwordHash'>> {
const name = data.name.trim();
const email = data.email.trim().toLowerCase();

if (!name || !email || !data.password) {
  throw new Error('Name, email, and password are required.');
}

if (await UserModel.exists({ email })) {
  throw new Error('An account with this email address already exists.');
}

const passwordHash = await bcrypt.hash(data.password, 12);

const user = await UserModel.create({
  id: `user-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
  name,
  email,
  role: 'client',
  company: data.company?.trim() || undefined,
  phone: data.phone?.trim() || undefined,
  passwordHash,
  createdAt: new Date().toISOString(),
});

return toPublicUser(user);

},

async getAdminSetupStatus(): Promise<{
isInitialized: boolean;
adminEmail?: string;
}> {
const [existingAdmin, config] = await Promise.all([
UserModel.exists({ role: 'admin' }),
AdminConfigModel.findOne({ id: 'admin-config' }).lean().exec(),
]);

const isInitialized = Boolean(existingAdmin || config?.isInitialized);

return {
  isInitialized,
  ...(config?.adminEmail ? { adminEmail: config.adminEmail } : {}),
};

},

async setupInitialAdmin(
data: CreateMongoAdminInput
): Promise<Omit<MongoAuthUser, 'passwordHash'>> {
const configuredSecret =
process.env.ADMIN_SETUP_SECRET ||
'freightplus_admin_setup_secure_token_2026';

const status = await this.getAdminSetupStatus();

if (status.isInitialized) {
  throw new Error(
    'Administrator setup has already been completed. This endpoint is permanently disabled.'
  );
}

if (data.setupSecret !== configuredSecret) {
  throw new Error(
    'Invalid Administrator Setup Secret. Please verify your configured ADMIN_SETUP_SECRET in .env.'
  );
}

const name = data.name.trim();
const email = data.email.trim().toLowerCase();

if (!name || !email || !data.password) {
  throw new Error('Name, email, and password are required.');
}

if (data.password.length < 8) {
  throw new Error('Administrator password must be at least 8 characters long.');
}

const passwordHash = await bcrypt.hash(data.password, 12);

const user = await UserModel.create({
  id: `admin-${Date.now()}`,
  name,
  email,
  role: 'admin',
  company: 'Freight Plus Command',
  passwordHash,
  createdAt: new Date().toISOString(),
});

await AdminConfigModel.findOneAndUpdate(
  { id: 'admin-config' },
  {
    $set: {
      id: 'admin-config',
      isInitialized: true,
      initializedAt: new Date().toISOString(),
      adminEmail: email,
    },
  },
  { upsert: true, new: true, runValidators: true }
).exec();

return toPublicUser(user);

},
};