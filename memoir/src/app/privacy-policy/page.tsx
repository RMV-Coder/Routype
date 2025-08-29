export default function PrivacyPolicyPage() {
	return (
		<div className="max-w-3xl mx-auto p-6 space-y-6">
			<h1 className="text-3xl font-semibold">Privacy Policy</h1>
			<p className="text-sm text-muted-foreground">Last updated: {`August 27, 2025`}</p>

			<section className="space-y-2">
				<h2 className="text-xl font-medium">Overview</h2>
				<p>
					{`This Privacy Policy explains how Routype ("we", "us", or "our") collects, uses, and protects your
					information when you use the Routype web app (the "Service"). By using the Service, you agree to the
					collection and use of information in accordance with this policy.`}
				</p>
			</section>

			<section className="space-y-2">
				<h2 className="text-xl font-medium">Information We Collect</h2>
				<ul className="list-disc pl-6 space-y-1">
					<li>Account information: name, email, profile image, and authentication identifiers.</li>
					<li>Content you create: journals, entries, messages, reactions, and related metadata.</li>
					<li>Usage data: app interactions, device and browser details, and diagnostics.</li>
					<li>Cookies: used for authentication, session management, and security.</li>
				</ul>
			</section>

			<section className="space-y-2">
				<h2 className="text-xl font-medium">How We Use Information</h2>
				<ul className="list-disc pl-6 space-y-1">
					<li>To provide and improve core features (journals, messaging, friends, communities).</li>
					<li>To personalize your experience and recommend content or people to follow.</li>
					<li>To ensure security, prevent abuse, and maintain reliability of the Service.</li>
					<li>To communicate service updates, changes, and support-related information.</li>
				</ul>
			</section>

			<section className="space-y-2">
				<h2 className="text-xl font-medium">Data Sharing</h2>
				<p>
					We do not sell your personal data. We may share data with service providers that help us operate the
					Service (e.g., infrastructure, analytics, content delivery), under strict confidentiality obligations.
					We may disclose information if required by law or to protect our rights and users.
				</p>
			</section>

			<section className="space-y-2">
				<h2 className="text-xl font-medium">Messaging and Encryption</h2>
				<p>
					Messages are designed for end-to-end encryption (E2EE). Where E2EE is enabled, we store only encrypted
					payloads and necessary metadata; plaintext is not retained on our servers. Some features (spam control,
					abuse mitigation) may rely on limited metadata.
				</p>
			</section>

			<section className="space-y-2">
				<h2 className="text-xl font-medium">Your Choices</h2>
				<ul className="list-disc pl-6 space-y-1">
					<li>Access and update your profile information in Settings or Profile.</li>
					<li>Control journal visibility (public, friends, private).</li>
					<li>Opt into auto-deletion for your message copies (e.g., delete after one year).</li>
					<li>Manage cookies via your browser settings.</li>
				</ul>
			</section>

			<section className="space-y-2">
				<h2 className="text-xl font-medium">Data Retention</h2>
				<p>
					We retain data only as long as necessary to provide the Service. You may request deletion of your
					account. Some information may be retained as required by law or for legitimate business purposes.
				</p>
			</section>

			<section className="space-y-2">
				<h2 className="text-xl font-medium">Security</h2>
				<p>
					We use industry-standard measures to protect your data. No system is 100% secure; we encourage using
					strong, unique passwords and enabling available security features.
				</p>
			</section>

			<section className="space-y-2">
				<h2 className="text-xl font-medium">Children</h2>
				<p>The Service is not intended for children under 13. Do not sign up if you are under this age.</p>
			</section>

			<section className="space-y-2">
				<h2 className="text-xl font-medium">Changes to This Policy</h2>
				<p>
					We may update this Policy periodically. Material changes will be communicated through the Service or by
					other reasonable means. Continued use constitutes acceptance of the updated Policy.
				</p>
			</section>

			<section className="space-y-2">
				<h2 className="text-xl font-medium">Contact</h2>
				<p>Questions? Contact us at routype.app@gmail.com.</p>
			</section>
		</div>
	);
}


