import { onDocumentWritten } from "firebase-functions/v2/firestore"
import { initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
export { onRatingCreated } from "./ratings"

initializeApp()

// Optional advanced mode:
// Sync role / blocked / verified flags from Firestore to custom claims.
// Use this when middleware or microservices must enforce authz without Firestore lookups.
export const syncUserClaims = onDocumentWritten("users/{uid}", async (event) => {
  const uid = event.params.uid
  const after = event.data?.after.data()
  if (!after) return

  const claims = {
    role: after.role ?? "user",
    blocked: Boolean(after.isBlocked),
    isBlocked: Boolean(after.isBlocked),
    email_verified: Boolean(after.emailVerified),
  }

  await getAuth().setCustomUserClaims(uid, claims)

  if (claims.blocked) {
    await getAuth().revokeRefreshTokens(uid)
  }
})
