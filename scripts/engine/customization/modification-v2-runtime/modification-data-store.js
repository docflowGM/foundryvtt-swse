/**
 * The Modification V2 data most recently loaded and VERIFIED by the install service's production loader (pins, header hash, specification
 * binding, catalog checks). Synchronous consumers (effects -> AmmoSystem) read it; it is null until a verified load succeeds, and every
 * consumer fails closed (no effect) while it is null.
 */
let verified = null;
export function setVerifiedModificationData(data) { verified = data?.ok === true ? data : verified; }
export function getVerifiedModificationData() { return verified; }
export function _resetVerifiedModificationDataForTests() { verified = null; }
export default { setVerifiedModificationData, getVerifiedModificationData };
