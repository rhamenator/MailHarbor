# OAuth verification checklist

The connected feature cannot be made public merely by adding a client ID. Before
release:

1. use separate development and production Google Cloud projects;
2. enable the Gmail API and configure the intended external audience;
3. request only `https://www.googleapis.com/auth/gmail.modify`;
4. host an accurate homepage and this privacy notice on a verified domain;
5. make the OAuth consent name, extension name, homepage, and privacy URL match;
6. justify why `gmail.labels` cannot inspect or modify message-label membership;
7. record the complete consent, dry-run, correction, selection, apply, and
   disconnect flow for the verification demonstration;
8. affirm Limited Use compliance and that personalized learning is local only;
9. submit for restricted-scope verification and follow Google's current security
   assessment determination;
10. publish only after approval, then monitor policy and scope changes.

Development/test projects can use explicitly added test users. An unverified
test flow is not a public release strategy.
