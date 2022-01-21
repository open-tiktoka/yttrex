import { readFile, writeFile } from 'fs/promises';

import { join } from 'path';

import { isRight } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';

const ProfileStateStorage = t.type(
  {
    nTimesUsed: t.number,
  },
  'ProfileStateStorage',
);
type ProfileStateStorage = t.TypeOf<typeof ProfileStateStorage>;

const initialProfileState: ProfileStateStorage = {
  nTimesUsed: 0,
};

export class ProfileState {
  constructor(
    private readonly path: string,
    private readonly storage: ProfileStateStorage,
  ) {
    this.storage.nTimesUsed += 1;
  }

  getNTimesUsed(): number {
    return this.storage.nTimesUsed;
  }

  public async save(): Promise<ProfileState> {
    const json = JSON.stringify(this.storage, null, 2);
    await writeFile(this.path, json);
    return this;
  }
}

const loadRawStorage = async(path: string): Promise<unknown> => {
  try {
    const json = await readFile(path, 'utf8');
    const data = JSON.parse(json);
    return {
      ...initialProfileState,
      ...data,
    };
  } catch (e) {
    return initialProfileState;
  }
};

export const loadProfileState = async(
  profile: string,
): Promise<ProfileState> => {
  const path = join(profile, 'tx.profileState.json');
  const data = await loadRawStorage(path);

  const state = ProfileStateStorage.decode(data);

  if (isRight(state)) {
    return new ProfileState(path, state.right).save();
  }

  throw new Error(PathReporter.report(state).join('\n'));
};

export default loadProfileState;
