export default function TermsOfServicePage() {
	return (
		<div className="max-w-3xl mx-auto p-6 space-y-6">
			<h1 className="text-3xl font-semibold">Terms of Service</h1>
			<p className="text-sm text-muted-foreground">Last updated: {`August 27, 2025`}</p>

			<section className="space-y-2">
				<h2 className="text-xl font-medium">Acceptance of Terms</h2>
				<p>
					{`By accessing or using Routype (the "Service"), you agree to be bound by these Terms. If you do not agree,
					do not use the Service.`}
				</p>
			</section>

			<section className="space-y-2">
				<h2 className="text-xl font-medium">Your Account</h2>
				<ul className="list-disc pl-6 space-y-1">
					<li>You are responsible for your account and the security of your credentials.</li>
					<li>You must provide accurate information and comply with applicable laws.</li>
				</ul>
			</section>

			<section className="space-y-2">
				<h2 className="text-xl font-medium">User Content</h2>
				<ul className="list-disc pl-6 space-y-1">
					<li>You own your content. You grant us a limited license to host and process it to operate the Service.</li>
					<li>Do not post illegal, harmful, or infringing content.</li>
					<li>Respect others. No harassment, hate speech, or spamming.</li>
				</ul>
			</section>

			<section className="space-y-2">
				<h2 className="text-xl font-medium">Messaging</h2>
				<p>
					We aim to support end-to-end encryption. While we work to provide reliable and secure messaging,
					we cannot guarantee uninterrupted availability.
				</p>
			</section>

			<section className="space-y-2">
				<h2 className="text-xl font-medium">Acceptable Use</h2>
				<ul className="list-disc pl-6 space-y-1">
					<li>No abuse of the Service (e.g., DDoS, unauthorized access, automated scraping).</li>
					<li>{`No distribution of malware or attempts to compromise others' security.`}</li>
				</ul>
			</section>

			<section className="space-y-2">
				<h2 className="text-xl font-medium">Termination</h2>
				<p>
					We may suspend or terminate access if you violate these Terms or pose risks to the Service or its users.
				</p>
			</section>

			<section className="space-y-2">
				<h2 className="text-xl font-medium">Disclaimers</h2>
				<p>
					{`The Service is provided "as is" without warranties of any kind. To the fullest extent permitted by law, we
					disclaim all warranties and limit liability for damages arising from your use of the Service.`}
				</p>
			</section>

			<section className="space-y-2">
				<h2 className="text-xl font-medium">Changes</h2>
				<p>
					We may update these Terms from time to time. Material changes will be communicated within the Service or
					via other reasonable means. Continued use signifies acceptance of the updated Terms.
				</p>
			</section>

			<section className="space-y-2">
				<h2 className="text-xl font-medium">Contact</h2>
				<p>Questions? Contact us at legal@routype.app.</p>
			</section>
		</div>
	);
}


