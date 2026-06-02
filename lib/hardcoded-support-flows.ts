export type HardcodedSupportNode = {
  id: string;
  label: string;
  response: string;
  options?: string[];
  sources?: string[];
};

const ROOT_ID = "root";

const NODES: Record<string, HardcodedSupportNode> = {
  [ROOT_ID]: {
    id: ROOT_ID,
    label: "Start",
    response: "Choose a suggested topic below or type your own question.",
    options: [
      "Printing Issues",
      "Opening Files",
      "Login Assistance",
      "Easel by TPT",
      "License Policy for Buyers",
    ],
  },
  printing_issues: {
    id: "printing_issues",
    label: "Printing Issues",
    response:
      "I can provide printing instructions. Before we get started, what file type are you having trouble with? Select a file type below.",
    options: [
      "ZIP",
      "PDF",
      "PowerPoint",
      "I don't know",
      "I need a permission letter to print",
    ],
  },
  printing_zip: {
    id: "printing_zip",
    label: "ZIP",
    response:
      "If you're opening, printing, or accessing a ZIP file, you'll need to uncompress the file first.\n\nA ZIP file is a compressed folder containing multiple files. Sellers often use ZIP files to provide multiple files in one TPT resource.\n\nIf you're using a desktop device, you won't need any additional software. However, if you're using a mobile device, you may need an app.\n\nFor more detailed instructions, select your device type below.",
    options: ["Microsoft Windows", "Mac OS", "Chromebook", "iOS (iPhone/iPad)"],
    sources: ["help-center-all/what-is-a-zip-file.md"],
  },
  printing_zip_windows: {
    id: "printing_zip_windows",
    label: "Microsoft Windows",
    response:
      "On Windows, right-click the unopened ZIP folder and choose \"Extract All.\" Pick a destination folder, then click \"Extract.\"\n\nIf you're extracting from Chrome downloads, open the download, click \"Extract All,\" and then open the new unzipped folder. If you see a `_MACOSX` folder, you can ignore or delete it.",
    sources: ["help-center-all/what-is-a-zip-file.md"],
  },
  printing_zip_mac: {
    id: "printing_zip_mac",
    label: "Mac OS",
    response:
      "On Mac, double-click the unopened ZIP file and it should extract automatically. If it doesn't, Control-click the ZIP file, choose \"Open With,\" and select \"Archive Utility.\" The extracted files will appear in the same folder as the ZIP.",
    sources: ["help-center-all/what-is-a-zip-file.md"],
  },
  printing_zip_chromebook: {
    id: "printing_zip_chromebook",
    label: "Chromebook",
    response:
      "On a Chromebook, double-click the ZIP file or right-click it and choose \"Extract all.\" Then drag the files from the mounted ZIP archive into another folder to make them usable and printable.",
    sources: ["help-center-all/what-is-a-zip-file.md"],
  },
  printing_zip_ios: {
    id: "printing_zip_ios",
    label: "iOS (iPhone/iPad)",
    response:
      "On current iOS versions, open the ZIP file from the Files app and tap it to unzip. If that doesn't work, TPT recommends using an app like [iZip](https://itunes.apple.com/us/app/izip-zip-unzip-unrar-tool/id413971331).",
    sources: ["help-center-all/what-is-a-zip-file.md"],
  },
  printing_pdf: {
    id: "printing_pdf",
    label: "PDF",
    response:
      "If you're having trouble printing a PDF, make sure you're opening it in the latest version of [Adobe Acrobat Reader](https://get.adobe.com/reader/).\n\nThen:\n- Open the PDF in Adobe Acrobat Reader.\n- Click \"Print.\"\n- In \"Page Sizing & Handling,\" choose \"Shrink oversized pages\" if needed.\n- Click \"Advanced.\"\n- Check \"Print As Image.\"\n- Print the document.",
    sources: ["help-center-all/what-if-my-file-isnt-printing-correctly.md"],
  },
  printing_powerpoint: {
    id: "printing_powerpoint",
    label: "PowerPoint",
    response:
      "For PowerPoint files, download the file fully, open it in the desktop version of Microsoft PowerPoint, and print from PowerPoint rather than from a browser preview. If the file still won't print correctly, export it as a PDF first and then use the PDF printing steps.",
  },
  printing_unknown: {
    id: "printing_unknown",
    label: "I don't know",
    response:
      "Check the file extension in the downloaded filename. `.zip` means the file must be extracted first, `.pdf` should be opened in Adobe Acrobat Reader, and `.ppt` or `.pptx` should be opened in Microsoft PowerPoint.\n\nIf you downloaded a bundle, you can also go to [My Purchases](https://www.teacherspayteachers.com/My-Purchases) and download individual files there.",
    sources: [
      "help-center-all/what-is-a-zip-file.md",
      "help-center-all/what-if-my-file-isnt-printing-correctly.md",
      "help-center-all/what-if-im-having-problems-opening-the-files-in-a-bundle-ive-downloaded.md",
    ],
  },
  printing_permission_letter: {
    id: "printing_permission_letter",
    label: "I need a permission letter to print",
    response:
      "TPT doesn't provide a universal permission letter inside this flow. Printing permissions depend on the resource license you purchased. If you're trying to confirm reuse rights, check the resource description and the seller's terms, or contact TPT CX for a licensing review.",
  },
  opening_files: {
    id: "opening_files",
    label: "Opening Files",
    response:
      "I can help with opening downloaded resources. What kind of file are you trying to open?",
    options: ["ZIP file", "PDF file", "Bundle download", "Google Drive resource"],
  },
  opening_zip: {
    id: "opening_zip",
    label: "ZIP file",
    response:
      "A ZIP file is a compressed folder that contains multiple files. It needs to be extracted before the files inside can be opened. On Windows and Mac, you can usually unzip it without extra software. If you need device-specific steps, choose Printing Issues > ZIP in this same chat flow.",
    sources: ["help-center-all/what-is-a-zip-file.md"],
  },
  opening_pdf: {
    id: "opening_pdf",
    label: "PDF file",
    response:
      "If the PDF is prompting for a password or won't open correctly, first make sure it was fully extracted from any ZIP file. Then open the PDF directly in the latest [Adobe Reader](http://www.adobe.com/products/reader.html) by launching Adobe Reader first and using File > Open.",
    sources: ["help-center-all/what-if-i-need-a-password-to-print.md"],
  },
  opening_bundle: {
    id: "opening_bundle",
    label: "Bundle download",
    response:
      "If you're having trouble opening a bundle, first unzip the download. If that still doesn't work, go to [My Purchases](https://www.teacherspayteachers.com/My-Purchases) or the bundle product page and download the individual resources one at a time instead of downloading the whole bundle.",
    sources: [
      "help-center-all/what-if-im-having-problems-opening-the-files-in-a-bundle-ive-downloaded.md",
    ],
  },
  opening_google_drive: {
    id: "opening_google_drive",
    label: "Google Drive resource",
    response:
      "For Made for Google Drive resources, click \"Add to Google Drive\" from the product page or [My Purchases](https://www.teacherspayteachers.com/My-Purchases). If the connection hangs, allow Google cookies in your browser and try again. TPT needs Drive access only so it can copy the seller's original file into your Google Drive.",
    sources: [
      "help-center-all/how-do-i-add-a-made-for-google-drive-resource-to-my-google-drive.md",
      "help-center-all/why-is-my-google-drive-resource-unable-to-connect-to-google.md",
      "help-center-all/why-does-tpt-need-access-to-my-google-drive-for-me-to-use-certain-digital-resources.md",
    ],
  },
  login_assistance: {
    id: "login_assistance",
    label: "Login Assistance",
    response:
      "I can help with common login issues. Choose the option that sounds closest.",
    options: [
      "Forgot username or password",
      "No access to account email",
      "Not receiving OTP email",
    ],
  },
  login_forgot_password: {
    id: "login_forgot_password",
    label: "Forgot username or password",
    response:
      "Go to the [Log in](https://www.teacherspayteachers.com/?authModal=login) page and choose [Forgot username](https://www.teacherspayteachers.com/Login/Forgot-Username?aref=4s0z40wy) or [Forgot password](https://www.teacherspayteachers.com/Login/Forgot-Password?aref=4s0z40wy).\n\nAfter entering the email address on your account, check your inbox for the automated email. If you don't see it, check spam or junk, Gmail Promotions, or the Outlook/Hotmail Other tab.",
    sources: ["help-center-all/i-forgot-my-username-or-password-what-do-i-do.md"],
  },
  login_no_email_access: {
    id: "login_no_email_access",
    label: "No access to account email",
    response:
      "If you no longer have access to the email address on your account, use the TPT Bot or contact flow so the Customer Experience team can help update and verify the account for you.",
    sources: [
      "help-center-all/what-if-i-no-longer-have-access-to-the-email-address-associated-with-my-account.md",
    ],
  },
  login_otp: {
    id: "login_otp",
    label: "Not receiving OTP email",
    response:
      "When a one-time password is required, TPT sends a six-digit verification code to the email address on file. Check for an email with the subject line \"Verify your account,\" then check spam, junk, and Gmail Promotions if needed.\n\nYou can also add [no-reply@login.teacherspayteachers.com](mailto:no-reply@login.teacherspayteachers.com) to your contacts to help future delivery.",
    sources: ["help-center-all/what-if-im-not-receiving-the-one-time-password-otp-email.md"],
  },
  easel: {
    id: "easel",
    label: "Easel by TPT",
    response:
      "I can help with common Easel questions. Choose a topic below.",
    options: [
      "What is Easel by TPT?",
      "How do I access Easel by TPT?",
      "What devices work with Easel?",
      "Can I print an Easel Activity?",
    ],
  },
  easel_what_is: {
    id: "easel_what_is",
    label: "What is Easel by TPT?",
    response:
      "Easel by TPT is TPT's suite of online learning tools for interactive instruction. It lets teachers assign TPT resources digitally, create their own activities, review student work, and use self-checking and feedback features.",
    sources: ["help-center-all/what-is-easel-by-tpt.md"],
  },
  easel_access: {
    id: "easel_access",
    label: "How do I access Easel by TPT?",
    response:
      "Log into your TPT account, click your profile icon in the top right, and choose [My Easel Library](https://easel.teacherspayteachers.com/activities).\n\nIf you're assigning an Easel Activity you've purchased, go to [My Purchases](https://www.teacherspayteachers.com/My-Purchases), click \"View X Files\" next to the resource, and choose \"Preview & Assign.\"",
    sources: ["help-center-all/how-do-i-access-easel-by-tpt.md"],
  },
  easel_devices: {
    id: "easel_devices",
    label: "What devices work with Easel?",
    response:
      "Easel is tested and optimized on Chromebooks, Windows, and Mac computers using recent versions of Chrome, Safari, Firefox, and Edge. Students can also use tablets and phones with Chrome or Safari, but creating or editing Easel Activities on small screens isn't recommended.",
    sources: ["help-center-all/what-devices-work-with-easel.md"],
  },
  easel_print: {
    id: "easel_print",
    label: "Can I print an Easel Activity?",
    response:
      "Easel Activities are designed to be used digitally and don't include a print option. If you need a printable version, download the PDF from [My Purchases](https://www.teacherspayteachers.com/My-Purchases) and print that instead.",
    sources: ["help-center-all/can-i-print-an-easel-activity.md"],
  },
  license_policy: {
    id: "license_policy",
    label: "License Policy for Buyers",
    response:
      "I can help with buyer licensing questions. Choose the topic that fits best.",
    options: [
      "What are multiple licenses?",
      "How do I buy multiple licenses?",
      "What is a transferable license?",
    ],
  },
  license_multiple: {
    id: "license_multiple",
    label: "What are multiple licenses?",
    response:
      "TPT resources are licensed for individual use. If more than one teacher will use a resource, you need one license per user. The first license is full price, and extra licenses are usually discounted.",
    sources: ["help-center-all/what-are-multiple-licenses.md"],
  },
  license_buy_more: {
    id: "license_buy_more",
    label: "How do I buy multiple licenses?",
    response:
      "You can buy additional licenses from the resource page using \"Buy licenses to share,\" from your cart before checkout, or later from [My Purchases](https://www.teacherspayteachers.com/My-Purchases) using \"Buy More Licenses.\"",
    sources: ["help-center-all/how-do-i-buy-multiple-licenses.md"],
  },
  license_transferable: {
    id: "license_transferable",
    label: "What is a transferable license?",
    response:
      "A transferable license lets a school retain a resource when an educator leaves or changes roles. It's available at a higher price and only for administrator buyers using TPT for Schools.",
    sources: ["help-center-all/what-is-a-transferable-license.md"],
  },
};

const DIRECT_MATCHES: Record<string, string> = {
  "printing issues": "printing_issues",
  zip: "printing_zip",
  "microsoft windows": "printing_zip_windows",
  "mac os": "printing_zip_mac",
  chromebook: "printing_zip_chromebook",
  "ios (iphone/ipad)": "printing_zip_ios",
  pdf: "printing_pdf",
  powerpoint: "printing_powerpoint",
  "i don't know": "printing_unknown",
  "i need a permission letter to print": "printing_permission_letter",
  "opening files": "opening_files",
  "zip file": "opening_zip",
  "pdf file": "opening_pdf",
  "bundle download": "opening_bundle",
  "google drive resource": "opening_google_drive",
  "login assistance": "login_assistance",
  "forgot username or password": "login_forgot_password",
  "no access to account email": "login_no_email_access",
  "not receiving otp email": "login_otp",
  "easel by tpt": "easel",
  "what is easel by tpt?": "easel_what_is",
  "how do i access easel by tpt?": "easel_access",
  "what devices work with easel?": "easel_devices",
  "can i print an easel activity?": "easel_print",
  "license policy for buyers": "license_policy",
  "what are multiple licenses?": "license_multiple",
  "how do i buy multiple licenses?": "license_buy_more",
  "what is a transferable license?": "license_transferable",
};

function normalizeLabel(value: string) {
  return value.trim().toLowerCase();
}

export function getHardcodedRootNode() {
  return NODES[ROOT_ID];
}

export function getHardcodedNode(id: string | null | undefined) {
  if (!id) {
    return null;
  }

  return NODES[id] ?? null;
}

export function resolveHardcodedNode(
  input: string,
  currentNodeId?: string | null,
): HardcodedSupportNode | null {
  const normalizedInput = normalizeLabel(input);
  const currentNode = currentNodeId ? NODES[currentNodeId] : null;

  if (currentNode?.options) {
    const matchingChildLabel = currentNode.options.find(
      (option) => normalizeLabel(option) === normalizedInput,
    );

    if (matchingChildLabel) {
      const childNodeId = DIRECT_MATCHES[normalizeLabel(matchingChildLabel)];
      if (childNodeId) {
        return NODES[childNodeId] ?? null;
      }
    }
  }

  const directNodeId = DIRECT_MATCHES[normalizedInput];
  if (directNodeId) {
    return NODES[directNodeId] ?? null;
  }

  return null;
}
