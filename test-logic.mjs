const data = [
{"email":"izaiasguilhermecore2@gmail.com","role":"user","plan":null,"status":null,"trial_ends_at":null,"subscription_ends_at":null},
{"email":"darciliok@gmail.com","role":"owner","plan":"annual","status":"active","trial_ends_at":null,"subscription_ends_at":"2026-10-25 23:08:11.353+00"},
{"email":"darcilio89@gmail.com","role":"user","plan":"monthly","status":"active","trial_ends_at":null,"subscription_ends_at":"2026-03-26 00:19:01.234+00"},
{"email":"dwefotografia@gmail.com","role":"owner","plan":"annual","status":"active","trial_ends_at":null,"subscription_ends_at":"2027-02-06 01:56:23.141+00"},
{"email":"teste@teste.com","role":"user","plan":null,"status":null,"trial_ends_at":null,"subscription_ends_at":null},
{"email":"darciliokv@yahoo.com.br","role":"user","plan":"annual","status":"active","trial_ends_at":null,"subscription_ends_at":"2026-10-22 11:27:23.913+00"},
{"email":"vourevisar@gmail.com","role":"owner","plan":"annual","status":"active","trial_ends_at":null,"subscription_ends_at":"2026-10-25 23:07:47.476+00"},
{"email":"wllyjardim1@gmail.com","role":"user","plan":"free_trial","status":"trial","trial_ends_at":"2025-10-27 00:13:42.555194+00","subscription_ends_at":null},
{"email":"fotografiawlly@gmail.com","role":"user","plan":"monthly","status":"active","trial_ends_at":null,"subscription_ends_at":"2025-11-22 19:44:59.87373+00"},
{"email":"ipsjota2@gmail.com","role":"user","plan":"annual","status":"expired","trial_ends_at":null,"subscription_ends_at":"2026-10-24 18:58:57.556+00"},
{"email":"phdtemiranda@gmail.com","role":"user","plan":"free_trial","status":"trial","trial_ends_at":"2025-10-27 00:13:42.555194+00","subscription_ends_at":null},
{"email":"rafaelocostagomes@gmail.com","role":"user","plan":"annual","status":"active","trial_ends_at":null,"subscription_ends_at":"2026-10-24 13:33:14.644254+00"},
{"email":"ddtank.joao@gmail.com","role":"user","plan":null,"status":null,"trial_ends_at":null,"subscription_ends_at":null}
];

let freeActiveUsers = 0; let monthlyUsers = 0; let annualUsers = 0; let expiredUsers = 0;
const now = new Date('2026-02-25T21:51:57-03:00');

data.forEach(user => {
  const subscription = user.status ? user : null;
  const userRole = user.role;
  if (userRole === 'owner' || userRole === 'admin') return;

  let isExpired = false; let isTrialActive = false; let isPlanActive = false;

  if (subscription) {
      const effectiveEndAt = subscription.subscription_ends_at || subscription.trial_ends_at || null;
      const effectiveEndDate = effectiveEndAt ? new Date(effectiveEndAt) : null;
      if (subscription.status === 'expired' || (effectiveEndDate && effectiveEndDate < now)) {
          isExpired = true;
          console.log(user.email, 'is expired!');
      } else if (subscription.status === 'trial') {
          isTrialActive = true;
      } else if (subscription.status === 'active') {
          isPlanActive = true;
      }
  }

  if (isExpired) {
    expiredUsers++;
  } else if (isTrialActive) {
    freeActiveUsers++;
  } else if (isPlanActive && subscription.plan === 'monthly') {
    monthlyUsers++;
  } else if (isPlanActive && subscription.plan === 'annual') {
    annualUsers++;
  }
});
console.log({ freeActiveUsers, monthlyUsers, annualUsers, expiredUsers });
