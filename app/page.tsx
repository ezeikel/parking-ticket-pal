import PageWrap from '@/components/PageWrap/PageWrap';
import SignInButton from '@/components/buttons/SignInButton/SignInButton';
import Image from 'next/image';

const HomePage = () => {
  return (
    <PageWrap>
      <section className="w-full my-auto">
        <div className="">
          <div className="grid items-center gap-6 lg:grid-cols-[1fr_500px] lg:gap-12 xl:grid-cols-[1fr_550px]">
            <Image
              alt="Happy adult Asian mother in car together with crop child"
              className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full lg:order-last"
              height={310}
              src="/images/pexels-ketut-subiyanto-4473500.jpg"
              width={550}
            />
            <div className="flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                <div className="font-sans inline-block rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">
                  Simplify Your Penalty & Parking Charge Notices
                </div>
                <h2 className="font-sans text-3xl font-bold tracking-tighter sm:text-5xl">
                  All Your Charge Notices, One Seamless Hub
                </h2>
                <p className="max-w-[600px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  Manage both Penalty and Parking Charge Notices with ease. PCNs
                  brings your fines into one view and uses AI to craft solid,
                  legally grounded challenge letters. Take a picture, submit,
                  and let intelligence do the heavy lifting.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <SignInButton text="Try It Out" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageWrap>
  );
};

export default HomePage;
